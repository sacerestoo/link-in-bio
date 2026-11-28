import json
import re
from decimal import Decimal, InvalidOperation
from html.parser import HTMLParser
from urllib.parse import urlsplit, urlunsplit

from contracts.response import ExtractedMetadata

_THREADS_HOSTS = {"threads.com", "www.threads.com", "threads.net", "www.threads.net"}
_FOLLOWERS = re.compile(
    r"(?P<count>[\d,.]+(?:\s*[KMB])?)\s+followers?\b",
    re.IGNORECASE,
)
_COUNT_MULTIPLIERS = {"K": 1_000, "M": 1_000_000, "B": 1_000_000_000}


class _JsonScriptParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.scripts: list[str] = []
        self._current_script: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if (
            tag == "script"
            and dict(attrs).get("type", "").casefold() == "application/json"
        ):
            self._current_script = []

    def handle_data(self, data: str) -> None:
        if self._current_script is not None:
            self._current_script.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag == "script" and self._current_script is not None:
            self.scripts.append("".join(self._current_script))
            self._current_script = None


def _requested_url(metadata: ExtractedMetadata) -> str:
    return metadata["requested_url"]


def _permalink(metadata: ExtractedMetadata) -> str:
    for url in (
        metadata["canonical_url"],
        metadata["final_url"],
        _requested_url(metadata),
    ):
        if not url:
            continue
        parts = urlsplit(url)
        if parts.hostname not in _THREADS_HOSTS:
            continue
        return urlunsplit(("https", parts.hostname, parts.path, "", ""))
    return _requested_url(metadata)


def _parse_count(value: str) -> tuple[int, bool] | None:
    match = re.fullmatch(r"([\d,.]+)([KMB])?", "".join(value.split()), re.IGNORECASE)
    if match is None:
        return None

    try:
        count = Decimal(match.group(1).replace(",", ""))
    except InvalidOperation:
        return None

    suffix = (match.group(2) or "").upper()
    count *= _COUNT_MULTIPLIERS.get(suffix, 1)
    return int(count), bool(suffix)


def _profile_provider_data(
    page: object,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    segments = [
        segment
        for segment in urlsplit(_requested_url(metadata)).path.split("/")
        if segment
    ]
    if not segments or not segments[0].startswith("@"):
        return {}

    provider_data: dict[str, object] = {
        "username": segments[0][1:],
        "profile_url": _permalink(metadata),
    }
    match = _FOLLOWERS.search(metadata["description"])
    if match is not None:
        count = _parse_count(match.group("count"))
        if count is not None:
            (
                provider_data["follower_count"],
                provider_data["follower_count_approximate"],
            ) = count
    return provider_data


def _find_post_like_count(value: object, post_id: str) -> int | None:
    if isinstance(value, dict):
        if value.get("code") == post_id:
            like_count = value.get("like_count")
            if type(like_count) is int and like_count >= 0:
                return like_count

        for child in value.values():
            like_count = _find_post_like_count(child, post_id)
            if like_count is not None:
                return like_count

    if isinstance(value, list):
        for child in value:
            like_count = _find_post_like_count(child, post_id)
            if like_count is not None:
                return like_count

    return None


def _post_like_count(page: object, post_id: str) -> int | None:
    body = getattr(page, "body", b"") or b""
    html = (
        body.decode("utf-8", errors="replace") if isinstance(body, bytes) else str(body)
    )
    parser = _JsonScriptParser()
    parser.feed(html)

    for script in parser.scripts:
        if post_id not in script or "like_count" not in script:
            continue
        try:
            payload = json.loads(script)
        except json.JSONDecodeError:
            continue
        like_count = _find_post_like_count(payload, post_id)
        if like_count is not None:
            return like_count
    return None


def _post_provider_data(
    page: object,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    segments = [
        segment
        for segment in urlsplit(_requested_url(metadata)).path.split("/")
        if segment
    ]
    if len(segments) < 3 or not segments[0].startswith("@") or segments[1] != "post":
        return {}

    provider_data: dict[str, object] = {
        "username": segments[0][1:],
        "post_id": segments[2],
        "permalink": _permalink(metadata),
        "text": metadata["description"],
    }
    like_count = _post_like_count(page, segments[2])
    if like_count is not None:
        provider_data["like_count"] = like_count
    return provider_data
