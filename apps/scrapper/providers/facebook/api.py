import json
import re
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation
from html.parser import HTMLParser
from urllib.parse import parse_qs, urlsplit, urlunsplit

from contracts.response import ExtractedMetadata
from sources.fetcher import FetchMode, fetch_page
from sources.html_metadata import extract_metadata as extract_shared_metadata

_COUNT = r"[\d,.]+(?:\s*[KMB])?"
_PROFILE_FOLLOWERS = re.compile(rf"(?P<count>{_COUNT})\s+followers?", re.IGNORECASE)
_PROFILE_TALKING = re.compile(
    rf"(?P<count>{_COUNT})\s+talking about this",
    re.IGNORECASE,
)
_KOREAN_FOLLOWERS = re.compile(r"팔로워\s*(?P<count>[\d,.]+(?:\s*[만억])?)\s*명?")
_KOREAN_TALKING = re.compile(
    r"이야기하고 있는 사람들\s*(?P<count>[\d,.]+(?:\s*[만억])?)\s*명?"
)
_COUNT_MULTIPLIERS = {
    "K": 1_000,
    "M": 1_000_000,
    "B": 1_000_000_000,
    "만": 10_000,
    "억": 100_000_000,
}
_PROFILE_SEGMENT = re.compile(r"[A-Za-z0-9._-]{1,100}")
_RESERVED_PROFILE_SEGMENTS = {
    "about",
    "ads",
    "business",
    "events",
    "groups",
    "help",
    "login",
    "marketplace",
    "pages",
    "people",
    "photo",
    "photos",
    "places",
    "profile.php",
    "public",
    "reel",
    "reels",
    "search",
    "share",
    "stories",
    "videos",
    "watch",
}


class _JsonScriptParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.scripts: list[str] = []
        self._in_json_script = False
        self._parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag != "script":
            return
        self._in_json_script = dict(attrs).get("type") == "application/json"
        self._parts = []

    def handle_data(self, data: str) -> None:
        if self._in_json_script:
            self._parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag != "script":
            return
        if self._in_json_script:
            self.scripts.append("".join(self._parts))
        self._in_json_script = False
        self._parts = []


@dataclass(frozen=True, slots=True)
class _FacebookPostPage:
    response: object
    post_story: dict[str, object] | None
    requested_url: str

    @property
    def body(self) -> object:
        return getattr(self.response, "body", b"")

    @property
    def headers(self) -> Mapping[str, str]:
        headers = getattr(self.response, "headers", {})
        return headers if isinstance(headers, Mapping) else {}

    @property
    def status(self) -> int:
        status = getattr(self.response, "status", 200)
        return status if type(status) is int else 200

    @property
    def url(self) -> str:
        return str(getattr(self.response, "url", None) or self.requested_url)


def _page_html(page: object) -> str:
    body = getattr(page, "body", b"") or b""
    return (
        body.decode("utf-8", errors="replace") if isinstance(body, bytes) else str(body)
    )


def _json_documents(page: object) -> list[object]:
    parser = _JsonScriptParser()
    parser.feed(_page_html(page))
    documents: list[object] = []
    for script in parser.scripts:
        if "permalink_url" not in script and "timeline_list_feed_units" not in script:
            continue
        try:
            documents.append(json.loads(script))
        except json.JSONDecodeError:
            continue
    return documents


def _walk_dicts(value: object):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from _walk_dicts(child)
    elif isinstance(value, list):
        for child in value:
            yield from _walk_dicts(child)


def _post_identifier(url: str) -> str:
    parts = urlsplit(url)
    segments = [segment for segment in parts.path.split("/") if segment]
    try:
        posts_index = segments.index("posts")
    except ValueError:
        posts_index = -1
    if posts_index >= 0 and posts_index + 1 < len(segments):
        if len(segments) > posts_index + 2 and segments[-1].isdigit():
            return segments[-1]
        return segments[posts_index + 1]

    query = parse_qs(parts.query)
    for key in ("story_fbid", "fbid", "v"):
        value = query.get(key, [""])[0]
        if value:
            return value

    if segments and segments[-1].isdigit():
        return segments[-1]
    return ""


def _story_urls(story: dict[str, object]) -> set[str]:
    urls: set[str] = set()
    for node in _walk_dicts(story):
        for key in ("permalink_url", "url", "wwwURL"):
            value = node.get(key)
            if isinstance(value, str) and "facebook.com" in value:
                urls.add(value)
    return urls


def _story_matches(story: dict[str, object], requested_url: str) -> bool:
    identifier = _post_identifier(requested_url)
    if not identifier:
        return False

    urls = _story_urls(story)
    if identifier.casefold().startswith("pfbid"):
        return any(identifier.casefold() in url.casefold() for url in urls)

    if str(story.get("post_id", "")) == identifier:
        return True

    for url in urls:
        parts = urlsplit(url)
        if identifier in [segment for segment in parts.path.split("/") if segment]:
            return True
        for key in ("story_fbid", "fbid", "v"):
            if identifier in parse_qs(parts.query).get(key, []):
                return True

    attachments = story.get("attachments")
    return any(
        str(node.get("id", "")) == identifier
        for node in _walk_dicts(attachments)
        if node.get("__typename") in {"Photo", "Video"}
    )


def _find_post_story(page: object, requested_url: str) -> dict[str, object] | None:
    for document in _json_documents(page):
        for node in _walk_dicts(document):
            permalink = node.get("permalink_url")
            if (
                node.get("__typename") == "Story"
                and isinstance(permalink, str)
                and _story_matches(node, requested_url)
            ):
                return node
    return None


def _profile_url_for_post(url: str) -> str | None:
    parts = urlsplit(url)
    segments = [segment for segment in parts.path.split("/") if segment]
    try:
        posts_index = segments.index("posts")
    except ValueError:
        posts_index = -1
    if posts_index > 0:
        if segments[0].casefold() in {"pages", "people"} and posts_index >= 3:
            profile_path = "/".join(segments[:3])
            return urlunsplit((parts.scheme, parts.netloc, f"/{profile_path}/", "", ""))
        profile = segments[posts_index - 1]
        if _PROFILE_SEGMENT.fullmatch(profile) is not None:
            return urlunsplit((parts.scheme, parts.netloc, f"/{profile}/", "", ""))

    if parts.path in {"/permalink.php", "/story.php", "/photo.php", "/photo/"}:
        profile_id = parse_qs(parts.query).get("id", [""])[0]
        if profile_id.isdigit():
            return urlunsplit(
                (parts.scheme, parts.netloc, "/profile.php", f"id={profile_id}", "")
            )
    return None


def _fetch_profile(
    url: str,
    mode: FetchMode,
    headers: Mapping[str, str] | None = None,
):
    return fetch_page(url, mode, headers=headers)


def _fetch_post(
    url: str,
    mode: FetchMode,
    headers: Mapping[str, str] | None = None,
) -> _FacebookPostPage:
    """Read a post from its profile's public embedded feed to stay under 4 MB."""
    profile_url = _profile_url_for_post(url)
    page = fetch_page(profile_url or url, mode, headers=headers)
    story = _find_post_story(page, url)
    return _FacebookPostPage(response=page, post_story=story, requested_url=url)


def _parse_count(value: str) -> tuple[int, bool] | None:
    normalized = "".join(value.split())
    match = re.fullmatch(r"([\d,.]+)([KMB만억])?", normalized, re.IGNORECASE)
    if match is None:
        return None
    try:
        count = Decimal(match.group(1).replace(",", ""))
    except InvalidOperation:
        return None
    suffix = (match.group(2) or "").upper()
    count *= _COUNT_MULTIPLIERS.get(suffix, 1)
    return int(count), bool(suffix)


def _profile_username(url: str) -> str:
    segments = [segment for segment in urlsplit(url).path.split("/") if segment]
    if not segments or segments[0].casefold() in _RESERVED_PROFILE_SEGMENTS:
        return ""
    username = segments[0]
    if username.isdigit():
        return ""
    return username if _PROFILE_SEGMENT.fullmatch(username) else ""


def _profile_id(url: str) -> str:
    parts = urlsplit(url)
    query_id = parse_qs(parts.query).get("id", [""])[0]
    if query_id.isdigit():
        return query_id
    segments = [segment for segment in parts.path.split("/") if segment]
    if segments and segments[0].isdigit():
        return segments[0]
    if len(segments) >= 3 and segments[0].casefold() in {"pages", "people"}:
        return segments[2] if segments[2].isdigit() else ""
    return ""


def _profile_stats(
    description: str,
    display_name: str,
) -> tuple[dict[str, object], str]:
    data: dict[str, object] = {}
    matches = []
    for patterns, target in (
        ((_PROFILE_FOLLOWERS, _KOREAN_FOLLOWERS), "follower_count"),
        ((_PROFILE_TALKING, _KOREAN_TALKING), "talking_about_count"),
    ):
        match = next(
            (
                found
                for pattern in patterns
                if (found := pattern.search(description)) is not None
            ),
            None,
        )
        if match is None:
            continue
        matches.append(match)
        parsed = _parse_count(match.group("count"))
        if parsed is None:
            continue
        count, approximate = parsed
        data[target] = count
        if approximate:
            data[f"{target}_approximate"] = True

    about = description[max((match.end() for match in matches), default=0) :]
    for pattern in (
        _PROFILE_FOLLOWERS,
        _PROFILE_TALKING,
        _KOREAN_FOLLOWERS,
        _KOREAN_TALKING,
    ):
        about = pattern.sub("", about, count=1)
    about = about.lstrip(" .·•,\n")
    if display_name and about.startswith(display_name):
        about = about[len(display_name) :].lstrip(" .·•,:\n")
    return data, about


def _extract_profile_provider_data(
    page: object,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    requested_url = metadata["requested_url"]
    profile_url = metadata["canonical_url"] or metadata["final_url"] or requested_url
    stats, about = _profile_stats(metadata["description"], metadata["title"])
    data: dict[str, object] = {
        "profile_url": profile_url,
        "username": _profile_username(requested_url),
        "display_name": metadata["title"],
        "description": about,
        "profile_image_url": metadata["image_url"],
        **stats,
    }
    profile_id = _profile_id(requested_url)
    if profile_id:
        data["profile_id"] = profile_id
    return data


def _post_story(page: object, requested_url: str) -> dict[str, object] | None:
    cached_story = getattr(page, "post_story", None)
    if isinstance(cached_story, dict):
        return cached_story
    return _find_post_story(page, requested_url)


def _post_text(story: dict[str, object]) -> str:
    sections = story.get("comet_sections")
    if isinstance(sections, dict):
        content = sections.get("content")
        if isinstance(content, dict):
            content_story = content.get("story")
            if isinstance(content_story, dict):
                message_sections = content_story.get("comet_sections")
                if isinstance(message_sections, dict):
                    message_section = message_sections.get("message")
                    if isinstance(message_section, dict):
                        message_story = message_section.get("story")
                        if isinstance(message_story, dict):
                            message = message_story.get("message")
                            if isinstance(message, dict):
                                text = message.get("text")
                                if isinstance(text, str):
                                    return " ".join(text.split())

    for node in _walk_dicts(sections):
        message = node.get("message")
        if isinstance(message, dict) and isinstance(message.get("text"), str):
            return " ".join(message["text"].split())
    return ""


def _post_author(story: dict[str, object]) -> tuple[str, str]:
    actors = story.get("actors")
    if not isinstance(actors, list):
        return "", ""
    actor = next((item for item in actors if isinstance(item, dict)), None)
    if actor is None:
        return "", ""
    name = actor.get("name")
    url = actor.get("url")
    return (
        name if isinstance(name, str) else "",
        url if isinstance(url, str) else "",
    )


def _post_author_image_url(story: dict[str, object]) -> str:
    sections = story.get("comet_sections")
    if not isinstance(sections, dict):
        return ""
    context_layout = sections.get("context_layout")
    if not isinstance(context_layout, dict):
        return ""
    context_story = context_layout.get("story")
    if not isinstance(context_story, dict):
        return ""
    context_sections = context_story.get("comet_sections")
    if not isinstance(context_sections, dict):
        return ""
    actor_photo = context_sections.get("actor_photo")
    if not isinstance(actor_photo, dict):
        return ""
    actor_story = actor_photo.get("story")
    if not isinstance(actor_story, dict):
        return ""
    actors = actor_story.get("actors")
    if not isinstance(actors, list):
        return ""
    actor = next((item for item in actors if isinstance(item, dict)), None)
    if actor is None:
        return ""
    profile_picture = actor.get("profile_picture")
    if not isinstance(profile_picture, dict):
        return ""
    image_url = profile_picture.get("uri")
    return (
        image_url
        if isinstance(image_url, str) and image_url.startswith("https://")
        else ""
    )


def _post_image_url(story: dict[str, object]) -> str:
    attachments = story.get("attachments")
    for node in _walk_dicts(attachments):
        for key in ("photo_image", "video_image", "thumbnail_image", "image"):
            image = node.get(key)
            if isinstance(image, dict):
                uri = image.get("uri")
                if isinstance(uri, str) and uri.startswith("https://"):
                    return uri
    return ""


def _feedback_summary(story: dict[str, object]) -> dict[str, object]:
    sections = story.get("comet_sections")
    if not isinstance(sections, dict):
        return {}
    feedback_section = sections.get("feedback")
    if not isinstance(feedback_section, dict):
        return {}
    for node in _walk_dicts(feedback_section):
        summary = node.get("comet_ufi_summary_and_actions_renderer")
        if isinstance(summary, dict):
            feedback = summary.get("feedback")
            if isinstance(feedback, dict):
                return feedback
    return {}


def _count_field(value: object) -> int | None:
    if isinstance(value, dict):
        value = value.get("count")
    return value if type(value) is int else None


def _post_counts(story: dict[str, object]) -> dict[str, object]:
    summary = _feedback_summary(story)
    data: dict[str, object] = {}
    for field in ("reaction_count", "share_count"):
        count = _count_field(summary.get(field))
        if count is not None:
            data[field] = count

    top_reactions = summary.get("top_reactions")
    edges = top_reactions.get("edges") if isinstance(top_reactions, dict) else None
    if isinstance(edges, list):
        for edge in edges:
            if not isinstance(edge, dict):
                continue
            reaction = edge.get("node")
            if not isinstance(reaction, dict):
                continue
            if str(reaction.get("localized_name", "")).casefold() != "like":
                continue
            like_count = _count_field(edge.get("reaction_count"))
            if like_count is not None:
                data["like_count"] = like_count
            break

    for node in _walk_dicts(summary):
        instance = node.get("comment_rendering_instance")
        if isinstance(instance, dict):
            comments = instance.get("comments")
            if isinstance(comments, dict) and type(comments.get("total_count")) is int:
                data["comment_count"] = comments["total_count"]
                break
    return data


def _created_at(story: dict[str, object]) -> str:
    timestamp = story.get("creation_time")
    if type(timestamp) is not int:
        return ""
    return datetime.fromtimestamp(timestamp, tz=UTC).isoformat().replace("+00:00", "Z")


def _text_excerpt(text: str, limit: int = 280) -> str:
    normalized = " ".join(text.split())
    if len(normalized) <= limit:
        return normalized
    return f"{normalized[: limit - 1].rstrip()}…"


def _metadata_for_post(
    page: object,
    requested_url: str,
    provider: str,
) -> tuple[ExtractedMetadata, dict[str, object] | None]:
    story = _post_story(page, requested_url)
    if story is None:
        return (
            {
                "requested_url": requested_url,
                "final_url": requested_url,
                "provider": provider,
                "http_status": getattr(page, "status", 200),
                "title": "Facebook post",
                "description": "",
                "image_url": "",
                "site_name": "Facebook",
                "type": "",
                "canonical_url": requested_url,
                "favicon_url": "",
            },
            None,
        )

    author_name, _ = _post_author(story)
    text = _post_text(story)
    image_url = _post_image_url(story)
    canonical_url = story.get("permalink_url")
    if not isinstance(canonical_url, str):
        canonical_url = next(iter(_story_urls(story)), requested_url)
    return (
        {
            "requested_url": requested_url,
            "final_url": requested_url,
            "provider": provider,
            "http_status": getattr(page, "status", 200),
            "title": f"{author_name} on Facebook" if author_name else "Facebook post",
            "description": text[:2000],
            "image_url": image_url,
            "site_name": "Facebook",
            "type": "",
            "canonical_url": canonical_url,
            "favicon_url": "",
        },
        story,
    )


def _extract_post_metadata(
    page: object,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    metadata, _ = _metadata_for_post(page, requested_url, provider)
    return metadata


def _extract_post_provider_data(
    page: object,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    requested_url = metadata["requested_url"]
    _, story = _metadata_for_post(page, requested_url, metadata["provider"])
    if story is None:
        return {"available": False, "permalink": requested_url}

    author_name, author_url = _post_author(story)
    text = _post_text(story)[:10_000]
    data: dict[str, object] = {
        "available": True,
        "permalink": metadata["canonical_url"],
        "text": text,
        "text_excerpt": _text_excerpt(text),
    }
    post_id = story.get("post_id")
    if isinstance(post_id, (str, int)) and not isinstance(post_id, bool):
        data["post_id"] = str(post_id)
    if author_name:
        data["author_name"] = author_name
    if author_url:
        data["author_url"] = author_url
    author_image_url = _post_author_image_url(story)
    if author_image_url:
        data["author_image_url"] = author_image_url
    created_at = _created_at(story)
    if created_at:
        data["created_at"] = created_at
    image_url = _post_image_url(story)
    if image_url:
        data["image_url"] = image_url
    data.update(_post_counts(story))
    return data


def _extract_profile_metadata(
    page: object,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    return extract_shared_metadata(page, requested_url, final_url, provider)
