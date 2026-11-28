import json
import re
from collections.abc import Mapping
from decimal import Decimal, InvalidOperation
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, urlunsplit

from contracts.response import ExtractedMetadata
from sources.fetcher import FetchMode, fetch_page
from sources.html_metadata import extract_metadata as extract_shared_metadata

_COUNT_TEXT = r"[\d,.]+(?:\s*[KMB])?"
_PROFILE_COUNTS = re.compile(
    rf"(?P<followers>{_COUNT_TEXT})\s+followers?\s*,\s*"
    rf"(?P<following>{_COUNT_TEXT})\s+following\s*,\s*"
    rf"(?P<posts>{_COUNT_TEXT})\s+posts?",
    re.IGNORECASE,
)
_POST_DESCRIPTION = re.compile(
    rf"^\s*(?P<likes>{_COUNT_TEXT})\s+likes?"
    rf"(?:,\s*(?P<comments>{_COUNT_TEXT})\s+comments?)?\s+-\s+"
    r"(?P<username>[A-Za-z0-9._]{1,30})\s+on\s+[^:]+:\s*(?P<caption>.*)$",
    re.IGNORECASE,
)
_COUNT_MULTIPLIERS = {"K": 1_000, "M": 1_000_000, "B": 1_000_000_000}
_CONTENT_PATH = re.compile(r"/(?:p|reel)/(?P<shortcode>[A-Za-z0-9_-]{1,32})/?")
_CONTEXT_JSON = re.compile(r'"contextJSON":"((?:\\.|[^"\\])*)"')


def _embed_url(profile_url: str) -> str:
    parts = urlsplit(profile_url)
    segments = [segment for segment in parts.path.split("/") if segment]
    if not segments or re.fullmatch(r"[A-Za-z0-9._]{1,30}", segments[0]) is None:
        return profile_url
    return urlunsplit((parts.scheme, parts.netloc, f"/{segments[0]}/embed/", "", ""))


def _fetch_profile(
    url: str,
    mode: FetchMode,
    headers: Mapping[str, str] | None = None,
):
    page = fetch_page(url, mode, headers=headers)
    final_path = urlsplit(str(getattr(page, "url", "") or url)).path
    if "/accounts/login/" not in f"{final_path}/":
        return page
    return fetch_page(_embed_url(url), mode, headers=headers)


def _profile_embed_context(page: object) -> dict[str, object] | None:
    body = getattr(page, "body", b"") or b""
    html = (
        body.decode("utf-8", errors="replace") if isinstance(body, bytes) else str(body)
    )
    match = _CONTEXT_JSON.search(html)
    if match is None:
        return None

    try:
        payload = json.loads(json.loads(f'"{match.group(1)}"'))
    except (json.JSONDecodeError, TypeError):
        return None
    context = payload.get("context") if isinstance(payload, dict) else None
    return context if isinstance(context, dict) else None


def _profile_url(username: str) -> str:
    return f"https://www.instagram.com/{username}/"


def _extract_profile_metadata(
    page: object,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    context = _profile_embed_context(page)
    if context is None:
        return extract_shared_metadata(page, requested_url, final_url, provider)

    username = context.get("username")
    username = (
        username if isinstance(username, str) else _username_from_url(requested_url)
    )
    profile_url = _profile_url(username) if username else requested_url
    full_name = context.get("full_name")
    title = (
        f"{full_name} (@{username}) • Instagram"
        if full_name and username
        else "Instagram"
    )
    image_url = context.get("profile_pic_url")

    return {
        "requested_url": requested_url,
        "final_url": profile_url,
        "provider": provider,
        "http_status": getattr(page, "status", 200),
        "title": title,
        "description": "",
        "image_url": urljoin(profile_url, image_url)
        if isinstance(image_url, str)
        else "",
        "site_name": "Instagram",
        "type": "profile",
        "canonical_url": profile_url,
        "favicon_url": "",
    }


def _username_from_url(url: str) -> str:
    segments = [segment for segment in urlsplit(url).path.split("/") if segment]
    if not segments:
        return ""
    username = segments[0]
    return username if re.fullmatch(r"[A-Za-z0-9._]{1,30}", username) else ""


def _parse_count(value: str) -> tuple[int, bool] | None:
    normalized = "".join(value.split())
    match = re.fullmatch(r"([\d,.]+)([KMB])?", normalized, re.IGNORECASE)
    if match is None:
        return None

    try:
        count = Decimal(match.group(1).replace(",", ""))
    except InvalidOperation:
        return None

    suffix = (match.group(2) or "").upper()
    count *= _COUNT_MULTIPLIERS.get(suffix, 1)
    return int(count), bool(suffix)


def _url_segments(metadata: ExtractedMetadata) -> list[str]:
    url = (
        metadata["canonical_url"] or metadata["final_url"] or metadata["requested_url"]
    )
    return [segment for segment in urlsplit(url).path.split("/") if segment]


def _shortcode(metadata: ExtractedMetadata) -> str:
    segments = _url_segments(metadata)
    try:
        post_index = segments.index("p")
    except ValueError:
        return ""

    if post_index + 1 == len(segments):
        return ""
    shortcode = segments[post_index + 1]
    return shortcode if re.fullmatch(r"[A-Za-z0-9_-]{1,32}", shortcode) else ""


def _username(metadata: ExtractedMetadata) -> str:
    segments = _url_segments(metadata)
    if not segments:
        return ""
    username = segments[0]
    return username if re.fullmatch(r"[A-Za-z0-9._]{1,30}", username) else ""


class _RecentPostParser(HTMLParser):
    def __init__(self, base_url: str) -> None:
        super().__init__()
        self.base_url = base_url
        self.posts: list[dict[str, str]] = []
        self._current_post: dict[str, str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        if tag == "a" and self._current_post is None:
            href = attributes.get("href") or ""
            permalink = urljoin(self.base_url, href)
            parsed = urlsplit(permalink)
            match = _CONTENT_PATH.search(parsed.path)
            if (
                parsed.hostname in {"instagram.com", "www.instagram.com"}
                and match is not None
            ):
                self._current_post = {
                    "shortcode": match.group("shortcode"),
                    "permalink": permalink,
                }
            return

        if tag == "img" and self._current_post is not None:
            image_url = (
                attributes.get("src")
                or attributes.get("data-src")
                or _first_srcset_url(attributes.get("srcset"))
            )
            if image_url:
                thumbnail_url = urljoin(self._current_post["permalink"], image_url)
                if urlsplit(thumbnail_url).scheme == "https":
                    self._current_post["thumbnail_url"] = thumbnail_url

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._current_post is not None:
            if self._current_post.get("thumbnail_url"):
                self.posts.append(self._current_post)
            self._current_post = None


def _first_srcset_url(value: str | None) -> str:
    if not value:
        return ""
    return value.split(",", 1)[0].strip().split(" ", 1)[0]


def _recent_posts(page: object, metadata: ExtractedMetadata) -> list[dict[str, str]]:
    context = _profile_embed_context(page)
    if context is not None:
        recent_posts = context.get("graphql_media")
        if not isinstance(recent_posts, list):
            return []

        posts: list[dict[str, str]] = []
        for item in recent_posts:
            if not isinstance(item, dict):
                continue
            media = item.get("shortcode_media")
            if not isinstance(media, dict):
                continue
            shortcode = media.get("shortcode")
            image_url = media.get("display_url")
            if not isinstance(shortcode, str) or not isinstance(image_url, str):
                continue
            if re.fullmatch(r"[A-Za-z0-9_-]{1,32}", shortcode) is None:
                continue

            media_path = "reel" if media.get("product_type") == "clips" else "p"
            posts.append(
                {
                    "shortcode": shortcode,
                    "permalink": f"https://www.instagram.com/{media_path}/{shortcode}/",
                    "thumbnail_url": image_url,
                }
            )
            if len(posts) == 4:
                break
        return posts

    body = getattr(page, "body", b"") or b""
    html = (
        body.decode("utf-8", errors="replace") if isinstance(body, bytes) else str(body)
    )
    parser = _RecentPostParser(metadata["final_url"] or metadata["requested_url"])
    parser.feed(html)

    posts: list[dict[str, str]] = []
    seen_shortcodes: set[str] = set()
    for post in parser.posts:
        shortcode = post["shortcode"]
        if shortcode in seen_shortcodes:
            continue
        seen_shortcodes.add(shortcode)
        posts.append(post)
        if len(posts) == 4:
            break
    return posts


def extract_profile_provider_data(
    page: object,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    context = _profile_embed_context(page)
    if context is not None:
        username = context.get("username")
        provider_data: dict[str, object] = {
            "username": username if isinstance(username, str) else _username(metadata),
            "recent_posts": _recent_posts(page, metadata),
        }
        for field, source_field in (
            ("follower_count", "followers_count"),
            ("following_count", "following_count"),
            ("post_count", "posts_count"),
        ):
            value = context.get(source_field)
            if isinstance(value, int) and not isinstance(value, bool):
                provider_data[field] = value
                provider_data[f"{field}_approximate"] = False
        return provider_data

    provider_data: dict[str, object] = {
        "username": _username(metadata),
        "recent_posts": _recent_posts(page, metadata),
    }
    counts = _PROFILE_COUNTS.search(metadata["description"])
    if counts is None:
        return provider_data

    for field, group in (
        ("follower_count", "followers"),
        ("following_count", "following"),
        ("post_count", "posts"),
    ):
        parsed = _parse_count(counts.group(group))
        if parsed is not None:
            provider_data[field], approximate = parsed
            provider_data[f"{field}_approximate"] = approximate

    return provider_data


def extract_post_provider_data(
    _page: object,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    provider_data: dict[str, object] = {"shortcode": _shortcode(metadata)}
    match = _POST_DESCRIPTION.match(metadata["description"])
    if match is None:
        return provider_data

    provider_data["username"] = match.group("username")
    caption = match.group("caption").strip()
    if caption.startswith(('"', "“")):
        caption = caption[1:]
    if caption.endswith(('".', "”.", '"', "”")):
        caption = caption[:-2] if caption.endswith(('".', "”.")) else caption[:-1]
    provider_data["caption"] = caption.strip()

    for field, group in (("like_count", "likes"), ("comment_count", "comments")):
        value = match.group(group)
        if value is None:
            continue
        parsed = _parse_count(value)
        if parsed is not None:
            provider_data[field], approximate = parsed
            provider_data[f"{field}_approximate"] = approximate

    return provider_data
