import json
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from typing import cast
from urllib.parse import urljoin, urlsplit, urlunsplit
from xml.etree import ElementTree

from contracts.errors import MetadataRequestError
from contracts.response import ExtractedMetadata
from sources.fetcher import FetchMode, fetch_page
from sources.html_metadata import extract_metadata as extract_html_metadata

_CONTENT = "{http://purl.org/rss/1.0/modules/content/}encoded"
_CREATOR = "{http://purl.org/dc/elements/1.1/}creator"
_RSS_TYPES = ("application/rss+xml", "application/xml", "text/xml")


class _PreloadsParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._capturing = False
        self._parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "script" and dict(attrs).get("id") == "preloads-json":
            self._capturing = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self._capturing:
            self._capturing = False

    def handle_data(self, data: str) -> None:
        if self._capturing:
            self._parts.append(data)


class _TextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def _as_mapping(value: object) -> dict[str, object]:
    return value if isinstance(value, dict) else {}


def _as_string(value: object) -> str:
    return value if isinstance(value, str) else ""


def _clean_text(value: object) -> str:
    if not isinstance(value, str) or not value:
        return ""
    parser = _TextParser()
    parser.feed(value)
    return " ".join(" ".join(parser.parts).split())


def _preloads(page: object) -> dict[str, object]:
    body = getattr(page, "body", b"") or b""
    html = (
        body.decode("utf-8", errors="replace") if isinstance(body, bytes) else str(body)
    )
    parser = _PreloadsParser()
    parser.feed(html)
    if not parser._parts:
        return {}
    try:
        return _as_mapping(json.loads("".join(parser._parts)))
    except json.JSONDecodeError:
        return {}


def _feed_url(value: str) -> str:
    parts = urlsplit(value)
    return urlunsplit((parts.scheme, parts.netloc, "/feed", "", ""))


def _fetch_feed(url: str, mode: FetchMode, headers: dict[str, str] | None = None):
    request_headers = {
        **(headers or {}),
        "Accept": "application/rss+xml, application/xml, text/xml;q=0.9",
    }
    return fetch_page(_feed_url(url), mode, headers=request_headers)


def _feed_root(page: object) -> ElementTree.Element:
    body = getattr(page, "body", b"") or b""
    try:
        return ElementTree.fromstring(body)
    except (ElementTree.ParseError, TypeError, ValueError):
        raise MetadataRequestError(
            "The Substack RSS feed returned invalid XML.", 502
        ) from None


def _channel(page: object) -> ElementTree.Element:
    channel = _feed_root(page).find("channel")
    if channel is None:
        raise MetadataRequestError("The Substack RSS feed has no channel.", 502)
    return channel


def _channel_image(channel: ElementTree.Element) -> str:
    return channel.findtext("image/url", default="").strip()


def _publication_url(publication: dict[str, object], fallback: str) -> str:
    custom_domain = _as_string(publication.get("custom_domain")).strip()
    if custom_domain:
        if "://" not in custom_domain:
            custom_domain = f"https://{custom_domain}"
        return custom_domain.rstrip("/")

    subdomain = _as_string(publication.get("subdomain")).strip()
    if subdomain:
        return f"https://{subdomain}.substack.com"
    return fallback.rstrip("/")


def _metadata_from_feed(
    page: object,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    channel = _channel(page)
    title = channel.findtext("title", default="").strip()
    description = _clean_text(channel.findtext("description", default=""))
    publication_url = channel.findtext("link", default="").strip()
    image_url = _channel_image(channel)
    return {
        "requested_url": requested_url,
        "final_url": final_url,
        "provider": provider,
        "http_status": getattr(page, "status", 200),
        "title": title,
        "description": description,
        "image_url": urljoin(final_url, image_url) if image_url else "",
        "site_name": title,
        "type": "website",
        "canonical_url": publication_url,
        "favicon_url": "",
    }


def _items(channel: ElementTree.Element, base_url: str) -> list[dict[str, object]]:
    posts: list[dict[str, object]] = []
    for item in channel.findall("item")[:10]:
        title = _clean_text(item.findtext("title", default=""))
        link = item.findtext("link", default="").strip()
        if not link:
            link = item.findtext("guid", default="").strip()
        if not title or not link:
            continue

        published = item.findtext("pubDate", default="").strip()
        try:
            published = parsedate_to_datetime(published).isoformat()
        except (TypeError, ValueError, OverflowError):
            pass

        posts.append(
            {
                "title": title,
                "url": urljoin(base_url, link),
                "published_at": published,
                "author": _clean_text(
                    item.findtext(_CREATOR, default="")
                    or item.findtext("author", default="")
                ),
                "summary": _clean_text(item.findtext("description", default="")),
            }
        )
    return posts


def _feed_provider_data(
    page: object,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    channel = _channel(page)
    return {
        "feed_url": metadata["final_url"],
        "publication_name": metadata["title"],
        "publication_url": metadata["canonical_url"],
        "item_count": len(channel.findall("item")),
        "items": _items(channel, metadata["final_url"]),
    }


def _publication_provider_data(
    page: object,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    data = _feed_provider_data(page, metadata)
    data.pop("items")
    data["publication_description"] = metadata["description"]
    data["publication_image_url"] = metadata["image_url"]
    return data


def _html_metadata(
    page: object,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    return extract_html_metadata(page, requested_url, final_url, provider)


def _profile_from_page(page: object, metadata: ExtractedMetadata) -> dict[str, object]:
    preloads = _preloads(page)
    profile = _as_mapping(preloads.get("profile"))
    handle = _as_string(profile.get("handle"))
    if not handle:
        handle = urlsplit(metadata["requested_url"]).path.strip("/").removeprefix("@")

    display_name = _as_string(profile.get("name"))
    profile_url = (
        f"https://substack.com/@{handle}" if handle else metadata["canonical_url"]
    )
    photo_url = _as_string(profile.get("photo_url")) or metadata["image_url"]
    publications: list[dict[str, object]] = []
    publication_users = profile.get("publicationUsers")
    if isinstance(publication_users, list):
        for entry in publication_users:
            user = _as_mapping(entry)
            publication = _as_mapping(user.get("publication"))
            if user.get("public") is not True or not publication:
                continue
            publications.append(
                {
                    "name": _as_string(publication.get("name")),
                    "url": _publication_url(publication, ""),
                    "description": _as_string(publication.get("hero_text")),
                }
            )

    return {
        "handle": handle,
        "profile_url": profile_url,
        "display_name": display_name or metadata["title"].split(" | ", 1)[0],
        "bio": _as_string(profile.get("bio")) or metadata["description"],
        "profile_image_url": photo_url,
        "publications": publications,
    }


def _extract_profile_metadata(
    page: object,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    metadata = _html_metadata(page, requested_url, final_url, provider)
    profile_data = _profile_from_page(page, metadata)
    return {
        **metadata,
        "title": f"{profile_data['display_name']} | Substack",
        "description": cast(str, profile_data["bio"]),
        "image_url": cast(str, profile_data["profile_image_url"]),
        "site_name": "Substack",
        "type": "profile",
        "canonical_url": cast(str, profile_data["profile_url"]),
    }


def _profile_provider_data(
    page: object,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    return _profile_from_page(page, metadata)


def _post_from_page(page: object) -> tuple[dict[str, object], dict[str, object]]:
    preloads = _preloads(page)
    return _as_mapping(preloads.get("post")), _as_mapping(preloads.get("pub"))


def _extract_post_metadata(
    page: object,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    metadata = _html_metadata(page, requested_url, final_url, provider)
    post, publication = _post_from_page(page)
    title = _as_string(post.get("title")) or metadata["title"]
    subtitle = _as_string(post.get("subtitle")) or metadata["description"]
    canonical = _as_string(post.get("canonical_url")) or metadata["canonical_url"]
    publication_name = _as_string(publication.get("name"))
    return {
        **metadata,
        "title": title,
        "description": subtitle,
        "site_name": publication_name or metadata["site_name"],
        "type": "article",
        "canonical_url": canonical or final_url,
    }


def _post_provider_data(
    page: object,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    post, publication = _post_from_page(page)
    requested = metadata["requested_url"]
    permalink = _as_string(post.get("canonical_url")) or metadata["canonical_url"]
    slug = _as_string(post.get("slug"))
    if not slug:
        slug = urlsplit(permalink or requested).path.rstrip("/").rsplit("/", 1)[-1]

    bylines = post.get("publishedBylines")
    authors = []
    if isinstance(bylines, list):
        for value in bylines:
            byline = _as_mapping(value)
            handle = _as_string(byline.get("handle"))
            authors.append(
                {
                    "name": _as_string(byline.get("name")),
                    "handle": handle,
                    "profile_url": f"https://substack.com/@{handle}" if handle else "",
                }
            )

    return {
        "post_id": post.get("id"),
        "slug": slug,
        "permalink": permalink or requested,
        "subtitle": _as_string(post.get("subtitle")) or metadata["description"],
        "published_at": _as_string(post.get("post_date")),
        "audience": _as_string(post.get("audience")),
        "post_type": _as_string(post.get("type")),
        "publication_name": _as_string(publication.get("name"))
        or metadata["site_name"],
        "publication_url": _publication_url(publication, requested),
        "authors": authors,
    }


def _publication_from_page(
    page: object, metadata: ExtractedMetadata
) -> dict[str, object]:
    publication = _as_mapping(_preloads(page).get("pub"))
    fallback_url = metadata["canonical_url"] or metadata["final_url"]
    return {
        "publication_name": _as_string(publication.get("name"))
        or metadata["site_name"],
        "publication_url": _publication_url(publication, fallback_url),
        "publication_description": _as_string(publication.get("hero_text"))
        or metadata["description"],
    }


def _extract_subscribe_metadata(
    page: object,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    metadata = _html_metadata(page, requested_url, final_url, provider)
    publication_data = _publication_from_page(page, metadata)
    return {
        **metadata,
        "site_name": cast(str, publication_data["publication_name"]),
        "type": "website",
    }


def _subscribe_provider_data(
    page: object,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    publication_data = _publication_from_page(page, metadata)
    return {
        **publication_data,
        "subscribe_url": metadata["canonical_url"] or metadata["final_url"],
    }


extract_feed_metadata = _metadata_from_feed
extract_feed_provider_data = _feed_provider_data
extract_publication_provider_data = _publication_provider_data
extract_profile_metadata = _extract_profile_metadata
extract_profile_provider_data = _profile_provider_data
extract_post_metadata = _extract_post_metadata
extract_post_provider_data = _post_provider_data
extract_subscribe_metadata = _extract_subscribe_metadata
extract_subscribe_provider_data = _subscribe_provider_data
fetch_feed = _fetch_feed
accepted_feed_types = _RSS_TYPES
