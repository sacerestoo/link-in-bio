import json
import os
import re
from collections.abc import Mapping
from dataclasses import dataclass
from urllib.parse import urlencode, urlsplit

from contracts.errors import MetadataRequestError
from contracts.response import ExtractedMetadata
from sources.fetcher import FetchMode, fetch_page

_API_BASE_URL = "https://openapi.chzzk.naver.com/open/v1"
_CHANNEL_ID = re.compile(r"[A-Za-z0-9_-]{1,128}")
_FAVICON_URL = "https://chzzk.naver.com/favicon.ico"


@dataclass(frozen=True, slots=True)
class ChzzkApiPage:
    body: bytes
    status: int
    url: str
    headers: Mapping[str, str]


def _channel_id(url: str) -> str:
    segments = [segment for segment in urlsplit(url).path.split("/") if segment]
    channel_id = segments[-1] if segments else ""
    if _CHANNEL_ID.fullmatch(channel_id) is None:
        raise MetadataRequestError("The CHZZK channel URL is invalid.")
    return channel_id


def _request_channel(channel_id: str, mode: FetchMode):
    client_id = os.environ.get("CHZZK_CLIENT_ID", "").strip()
    client_secret = os.environ.get("CHZZK_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise MetadataRequestError(
            "CHZZK Client credentials are not configured.",
            503,
        )

    query = urlencode({"channelIds": channel_id})
    url = f"{_API_BASE_URL}/channels?{query}"
    return fetch_page(
        url,
        mode,
        headers={
            "Accept": "application/json",
            "Client-Id": client_id,
            "Client-Secret": client_secret,
        },
    )


def _items(payload: object) -> list[dict[str, object]]:
    if not isinstance(payload, dict):
        return []

    for key in ("content", "data"):
        value = payload.get(key)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
        if isinstance(value, dict):
            nested = _items(value)
            if nested:
                return nested
    return []


def _decode_page(page: object) -> dict[str, object]:
    body = getattr(page, "body", b"") or b""
    try:
        payload = json.loads(body)
    except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
        raise MetadataRequestError(
            "The CHZZK API returned invalid JSON.",
            502,
        ) from None
    if not isinstance(payload, dict):
        raise MetadataRequestError(
            "The CHZZK API returned an invalid response.",
            502,
        )
    return payload


def _synthetic_page(page: object, payload: dict[str, object]) -> ChzzkApiPage:
    return ChzzkApiPage(
        body=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        status=page.status,
        url=page.url,
        headers={"content-type": "application/json"},
    )


def fetch_channel(url: str, mode: FetchMode, headers=None):
    channel_id = _channel_id(url)
    page = _request_channel(channel_id, mode)
    if not 200 <= page.status < 300:
        return page

    channel = next(
        (
            item
            for item in _items(_decode_page(page))
            if item.get("channelId") == channel_id
        ),
        None,
    )
    return _synthetic_page(page, {"kind": "channel", "channel": channel})


def _as_string(value: object) -> str:
    return value if isinstance(value, str) else ""


def _as_int(value: object) -> int | None:
    return value if isinstance(value, int) and not isinstance(value, bool) else None


def _page_channel(page: object) -> dict[str, object]:
    payload = _decode_page(page)
    if payload.get("kind") != "channel":
        raise MetadataRequestError(
            "The CHZZK API returned an unexpected response.",
            502,
        )
    channel = payload.get("channel")
    if channel is None:
        raise MetadataRequestError("The CHZZK channel was not found.", 404)
    if not isinstance(channel, dict):
        raise MetadataRequestError(
            "The CHZZK API returned an invalid channel.",
            502,
        )
    return channel


def _canonical_url(requested_url: str) -> str:
    parsed = urlsplit(requested_url)
    path = parsed.path.rstrip("/")
    return f"https://chzzk.naver.com{path}"


def extract_metadata(
    page: object,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    channel = _page_channel(page)
    if not channel.get("channelId"):
        raise MetadataRequestError("The CHZZK channel was not found.", 404)

    channel_name = _as_string(channel.get("channelName")) or "CHZZK Channel"
    image_url = _as_string(channel.get("channelImageUrl"))
    canonical_url = _canonical_url(requested_url)

    return {
        "requested_url": requested_url,
        "final_url": canonical_url,
        "provider": provider,
        "http_status": page.status,
        "title": channel_name,
        "description": "",
        "image_url": image_url,
        "site_name": "CHZZK",
        "type": "profile",
        "canonical_url": canonical_url,
        "favicon_url": _FAVICON_URL,
    }


def extract_provider_data(
    page: object,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    channel = _page_channel(page)
    channel_id = _as_string(channel.get("channelId")) or _channel_id(
        metadata["requested_url"]
    )
    provider_data: dict[str, object] = {
        "channelId": channel_id,
        "channelName": _as_string(channel.get("channelName")),
    }

    follower_count = _as_int(channel.get("followerCount"))
    if follower_count is not None:
        provider_data["followerCount"] = follower_count
    verified_mark = channel.get("verifiedMark")
    if isinstance(verified_mark, bool):
        provider_data["verifiedMark"] = verified_mark
    channel_image = _as_string(channel.get("channelImageUrl"))
    if channel_image:
        provider_data["channelImageUrl"] = channel_image

    return provider_data
