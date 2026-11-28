import json
import os
import re
from collections.abc import Mapping
from dataclasses import dataclass
from urllib.parse import parse_qs, unquote, urlencode, urlsplit

from contracts.errors import MetadataRequestError
from contracts.response import ExtractedMetadata
from sources.fetcher import FetchMode, fetch_page

_API_BASE_URL = "https://www.googleapis.com/youtube/v3"
_YOUTUBE_FAVICON = "https://www.youtube.com/favicon.ico"
_VIDEO_ID = re.compile(r"[A-Za-z0-9_-]{11}")
_CHANNEL_ID = re.compile(r"[A-Za-z0-9_-]{1,128}")
_CHANNEL_SELECTOR = re.compile(r"[A-Za-z0-9._-]{1,100}")


@dataclass(frozen=True, slots=True)
class YouTubeApiPage:
    body: bytes
    status: int
    url: str
    headers: Mapping[str, str]


def _api_key() -> str:
    key = os.environ.get("YOUTUBE_API_KEY", "").strip()
    if not key:
        raise MetadataRequestError("YouTube API credentials are not configured.", 503)
    return key


def _request_api(
    endpoint: str,
    params: Mapping[str, str],
    mode: FetchMode,
):
    url = f"{_API_BASE_URL}/{endpoint}?{urlencode(params)}"
    return fetch_page(
        url,
        mode,
        headers={"Accept": "application/json", "X-Goog-Api-Key": _api_key()},
    )


def _decode_payload(page: object) -> dict[str, object]:
    body = getattr(page, "body", b"") or b""
    try:
        payload = json.loads(body)
    except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
        raise MetadataRequestError(
            "The YouTube API returned invalid JSON.",
            502,
        ) from None
    if not isinstance(payload, dict):
        raise MetadataRequestError(
            "The YouTube API returned an invalid response.",
            502,
        )
    return payload


def _first_item(payload: dict[str, object]) -> dict[str, object] | None:
    items = payload.get("items")
    if not isinstance(items, list):
        raise MetadataRequestError(
            "The YouTube API returned an invalid response.",
            502,
        )
    return next((item for item in items if isinstance(item, dict)), None)


def _synthetic_page(page: object, kind: str, **data: object) -> YouTubeApiPage:
    payload = {"kind": kind, **data}
    return YouTubeApiPage(
        body=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        status=page.status,
        url=page.url,
        headers={"content-type": "application/json"},
    )


def _channel_filter(url: str) -> tuple[str, str]:
    parsed = urlsplit(url)
    segments = [unquote(segment) for segment in parsed.path.split("/") if segment]
    if segments and segments[0].startswith("@"):
        handle = segments[0][1:]
        if _CHANNEL_SELECTOR.fullmatch(handle):
            return "forHandle", handle
    if len(segments) > 1 and segments[0] == "channel":
        channel_id = segments[1]
        if _CHANNEL_ID.fullmatch(channel_id):
            return "id", channel_id
    if len(segments) > 1 and segments[0] == "user":
        username = segments[1]
        if _CHANNEL_SELECTOR.fullmatch(username):
            return "forUsername", username
    raise MetadataRequestError("The YouTube channel URL is invalid.")


def _video_id(url: str) -> str:
    parsed = urlsplit(url)
    if parsed.hostname == "youtu.be":
        segments = [unquote(segment) for segment in parsed.path.split("/") if segment]
        video_id = segments[0] if segments else ""
    else:
        segments = [unquote(segment) for segment in parsed.path.split("/") if segment]
        if parsed.path.rstrip("/") == "/watch":
            video_id = parse_qs(parsed.query).get("v", [""])[0]
        elif len(segments) > 1 and segments[0] in ("shorts", "embed", "live"):
            video_id = segments[1]
        else:
            video_id = ""

    if _VIDEO_ID.fullmatch(video_id) is None:
        raise MetadataRequestError("The YouTube video URL is invalid.")
    return video_id


def _as_mapping(value: object) -> dict[str, object]:
    return value if isinstance(value, dict) else {}


def _as_string(value: object) -> str:
    return value if isinstance(value, str) else ""


def _as_count(value: object) -> int | None:
    if isinstance(value, int) and not isinstance(value, bool) and value >= 0:
        return value
    if isinstance(value, str) and value.isdecimal():
        return int(value)
    return None


def _thumbnail(thumbnails: object) -> str:
    available = _as_mapping(thumbnails)
    for size in ("maxres", "standard", "high", "medium", "default"):
        url = _as_string(_as_mapping(available.get(size)).get("url"))
        if url.startswith("https://"):
            return url
    return ""


def _api_channel(
    url: str,
    mode: FetchMode,
    headers: Mapping[str, str] | None = None,
):
    channel_filter, value = _channel_filter(url)
    page = _request_api(
        "channels",
        {
            "part": "contentDetails,snippet,statistics",
            channel_filter: value,
        },
        mode,
    )
    if not 200 <= page.status < 300:
        return page

    channel = _first_item(_decode_payload(page))
    recent_thumbnails: list[str] = []
    if channel is not None:
        related_playlists = _as_mapping(
            _as_mapping(channel.get("contentDetails")).get("relatedPlaylists")
        )
        uploads_id = _as_string(related_playlists.get("uploads"))
        if uploads_id:
            playlist_page = _request_api(
                "playlistItems",
                {
                    "part": "snippet",
                    "playlistId": uploads_id,
                    "maxResults": "4",
                },
                mode,
            )
            if 200 <= playlist_page.status < 300:
                playlist_payload = _decode_payload(playlist_page)
                playlist_items = playlist_payload.get("items")
                if isinstance(playlist_items, list):
                    for item in playlist_items:
                        if not isinstance(item, dict):
                            continue
                        snippet = _as_mapping(item.get("snippet"))
                        image_url = _thumbnail(snippet.get("thumbnails"))
                        if image_url:
                            recent_thumbnails.append(image_url)

    return _synthetic_page(
        page,
        "channel",
        channel=channel,
        recentVideoThumbnailUrls=recent_thumbnails,
    )


def _api_video(
    url: str,
    mode: FetchMode,
    headers: Mapping[str, str] | None = None,
):
    requested_id = _video_id(url)
    page = _request_api(
        "videos",
        {"part": "snippet,statistics", "id": requested_id},
        mode,
    )
    if not 200 <= page.status < 300:
        return page

    video = _first_item(_decode_payload(page))
    if video is not None and video.get("id") != requested_id:
        raise MetadataRequestError(
            "The YouTube API returned a different video.",
            502,
        )
    return _synthetic_page(page, "video", video=video)


def _resource(page: object, kind: str) -> tuple[dict[str, object], dict[str, object]]:
    payload = _decode_payload(page)
    if payload.get("kind") != kind:
        raise MetadataRequestError(
            "The YouTube API returned an unexpected response.",
            502,
        )
    key = "channel" if kind == "channel" else "video"
    resource = payload.get(key)
    if resource is None:
        raise MetadataRequestError(f"The YouTube {kind} was not found.", 404)
    if not isinstance(resource, dict):
        raise MetadataRequestError(
            "The YouTube API returned an invalid resource.",
            502,
        )
    return resource, payload


def _extract_channel_metadata(
    page: object,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    channel, payload = _resource(page, "channel")
    snippet = _as_mapping(channel.get("snippet"))
    channel_id = _as_string(channel.get("id"))
    if not channel_id:
        raise MetadataRequestError("The YouTube channel was not found.", 404)

    title = _as_string(snippet.get("title")) or "YouTube channel"
    recent_thumbnails = payload.get("recentVideoThumbnailUrls")
    recent_image = (
        recent_thumbnails[0]
        if isinstance(recent_thumbnails, list)
        and recent_thumbnails
        and isinstance(recent_thumbnails[0], str)
        else ""
    )
    image_url = recent_image or _thumbnail(snippet.get("thumbnails"))
    canonical_url = f"https://www.youtube.com/channel/{channel_id}"

    return {
        "requested_url": requested_url,
        "final_url": canonical_url,
        "provider": provider,
        "http_status": page.status,
        "title": title,
        "description": _as_string(snippet.get("description")),
        "image_url": image_url,
        "site_name": "YouTube",
        "type": "profile",
        "canonical_url": canonical_url,
        "favicon_url": _YOUTUBE_FAVICON,
    }


def _extract_channel_provider_data(
    page: object,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    channel, payload = _resource(page, "channel")
    snippet = _as_mapping(channel.get("snippet"))
    statistics = _as_mapping(channel.get("statistics"))
    channel_id = _as_string(channel.get("id"))
    provider_data: dict[str, object] = {
        "channelId": channel_id,
        "channelTitle": _as_string(snippet.get("title")),
    }
    for key in ("subscriberCount", "viewCount", "videoCount"):
        count = _as_count(statistics.get(key))
        if count is not None:
            provider_data[key] = count

    channel_image = _thumbnail(snippet.get("thumbnails"))
    if channel_image:
        provider_data["channelImageUrl"] = channel_image
    recent_thumbnails = payload.get("recentVideoThumbnailUrls")
    if isinstance(recent_thumbnails, list) and recent_thumbnails:
        provider_data["recentVideoThumbnailUrls"] = recent_thumbnails
    return provider_data


def _extract_video_metadata(
    page: object,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    video, _ = _resource(page, "video")
    snippet = _as_mapping(video.get("snippet"))
    video_id = _as_string(video.get("id"))
    if not video_id:
        raise MetadataRequestError("The YouTube video was not found.", 404)

    canonical_url = f"https://www.youtube.com/watch?v={video_id}"
    return {
        "requested_url": requested_url,
        "final_url": canonical_url,
        "provider": provider,
        "http_status": page.status,
        "title": _as_string(snippet.get("title")) or "YouTube video",
        "description": _as_string(snippet.get("description")),
        "image_url": _thumbnail(snippet.get("thumbnails")),
        "site_name": "YouTube",
        "type": "video.other",
        "canonical_url": canonical_url,
        "favicon_url": _YOUTUBE_FAVICON,
    }


def _extract_video_provider_data(
    page: object,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    video, _ = _resource(page, "video")
    snippet = _as_mapping(video.get("snippet"))
    statistics = _as_mapping(video.get("statistics"))
    provider_data: dict[str, object] = {"videoId": _as_string(video.get("id"))}
    for key in ("channelId", "channelTitle", "publishedAt", "categoryId"):
        value = snippet.get(key)
        if isinstance(value, str):
            provider_data[key] = value
    for key in ("viewCount", "likeCount", "commentCount"):
        count = _as_count(statistics.get(key))
        if count is not None:
            provider_data[key] = count
    return provider_data
