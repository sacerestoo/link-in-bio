import json
import os
import re
from collections.abc import Mapping
from dataclasses import dataclass
from urllib.parse import unquote, urlencode, urlsplit

from contracts.errors import MetadataRequestError
from contracts.response import ExtractedMetadata
from providers.twitch.token import request_with_access_token
from sources.fetcher import FetchMode, fetch_page

_API_BASE_URL = "https://api.twitch.tv/helix"
_PROFILE_LOGIN = re.compile(r"[A-Za-z0-9_]{1,25}")
_VIDEO_ID = re.compile(r"[0-9]{1,30}")
_TWITCH_FAVICON = "https://www.twitch.tv/favicon.ico"


@dataclass(frozen=True, slots=True)
class TwitchApiPage:
    body: bytes
    status: int
    url: str
    headers: Mapping[str, str]


def _as_mapping(value: object) -> Mapping[str, object]:
    return value if isinstance(value, Mapping) else {}


def _as_string(value: object) -> str:
    return value if isinstance(value, str) else ""


def _as_count(value: object) -> int | None:
    if isinstance(value, int) and not isinstance(value, bool) and value >= 0:
        return value
    return None


def _client_id() -> str:
    client_id = os.environ.get("TWITCH_CLIENT_ID", "").strip()
    if not client_id:
        raise MetadataRequestError("Twitch app credentials are not configured.", 503)
    return client_id


def _profile_login(url: str) -> str:
    segments = [
        unquote(segment) for segment in urlsplit(url).path.split("/") if segment
    ]
    login = segments[0] if len(segments) == 1 else ""
    if _PROFILE_LOGIN.fullmatch(login) is None:
        raise MetadataRequestError("The Twitch profile URL is invalid.")
    return login


def _video_id(url: str) -> str:
    segments = [
        unquote(segment) for segment in urlsplit(url).path.split("/") if segment
    ]
    video_id = segments[1] if len(segments) == 2 and segments[0] == "videos" else ""
    if _VIDEO_ID.fullmatch(video_id) is None:
        raise MetadataRequestError("The Twitch video URL is invalid.")
    return video_id


def _request_api(url: str, mode: FetchMode):
    def send(token: str):
        return fetch_page(
            url,
            mode,
            headers={
                "Accept": "application/json",
                "Client-Id": _client_id(),
                "Authorization": f"Bearer {token}",
            },
        )

    return request_with_access_token(send)


def _json_object(page: object) -> dict[str, object]:
    body = getattr(page, "body", b"") or b""
    try:
        payload = json.loads(body)
    except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
        raise MetadataRequestError(
            "The Twitch API returned invalid JSON.", 502
        ) from None
    if not isinstance(payload, dict):
        raise MetadataRequestError("The Twitch API returned an invalid response.", 502)
    return payload


def _first_item(page: object, kind: str) -> dict[str, object]:
    payload = _json_object(page)
    data = payload.get("data")
    if not isinstance(data, list):
        raise MetadataRequestError("The Twitch API returned an invalid response.", 502)
    item = next((value for value in data if isinstance(value, dict)), None)
    if item is None:
        raise MetadataRequestError(f"The Twitch {kind} was not found.", 404)
    return item


def _synthetic_page(page: object, kind: str, **data: object) -> TwitchApiPage:
    return TwitchApiPage(
        body=json.dumps({"kind": kind, **data}, ensure_ascii=False).encode("utf-8"),
        status=page.status,
        url=page.url,
        headers={"content-type": "application/json"},
    )


def _api_profile(url: str, mode: FetchMode, headers=None):
    login = _profile_login(url)
    api_url = f"{_API_BASE_URL}/users?{urlencode({'login': login})}"
    page = _request_api(api_url, mode)
    if not 200 <= page.status < 300:
        return page

    user = _first_item(page, "profile")
    if _as_string(user.get("login")).casefold() != login.casefold():
        raise MetadataRequestError("The Twitch API returned a different profile.", 502)

    followers_url = f"{_API_BASE_URL}/channels/followers?{urlencode({'broadcaster_id': user['id']})}"
    followers_page = _request_api(followers_url, mode)
    if not 200 <= followers_page.status < 300:
        return followers_page
    follower_count = _as_count(_json_object(followers_page).get("total"))
    if follower_count is None:
        raise MetadataRequestError(
            "The Twitch API returned an invalid follower count.", 502
        )
    return _synthetic_page(page, "profile", user=user, follower_count=follower_count)


def _api_video(url: str, mode: FetchMode, headers=None):
    video_id = _video_id(url)
    api_url = f"{_API_BASE_URL}/videos?{urlencode({'id': video_id})}"
    page = _request_api(api_url, mode)
    if not 200 <= page.status < 300:
        return page

    video = _first_item(page, "video")
    if _as_string(video.get("id")) != video_id:
        raise MetadataRequestError("The Twitch API returned a different video.", 502)
    return _synthetic_page(page, "video", video=video)


def _resource(page: object, kind: str) -> Mapping[str, object]:
    payload = _json_object(page)
    if payload.get("kind") != kind:
        raise MetadataRequestError(
            "The Twitch API returned an unexpected response.", 502
        )
    resource = payload.get("user" if kind == "profile" else "video")
    if not isinstance(resource, Mapping):
        raise MetadataRequestError(f"The Twitch {kind} was not found.", 404)
    return resource


def _extract_profile_metadata(
    page: object,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    user = _resource(page, "profile")
    login = _as_string(user.get("login"))
    user_id = _as_string(user.get("id"))
    if not login or not user_id:
        raise MetadataRequestError("The Twitch profile was not found.", 404)

    canonical_url = f"https://www.twitch.tv/{login}"
    return {
        "requested_url": requested_url,
        "final_url": canonical_url,
        "provider": provider,
        "http_status": page.status,
        "title": _as_string(user.get("display_name")) or login,
        "description": _as_string(user.get("description")),
        "image_url": _as_string(user.get("profile_image_url")),
        "site_name": "Twitch",
        "type": "profile",
        "canonical_url": canonical_url,
        "favicon_url": _TWITCH_FAVICON,
    }


def _extract_profile_provider_data(
    page: object,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    user = _resource(page, "profile")
    provider_data: dict[str, object] = {
        "userId": _as_string(user.get("id")),
        "login": _as_string(user.get("login")),
        "displayName": _as_string(user.get("display_name")),
        "imageUrl": metadata["image_url"],
    }
    follower_count = _as_count(_json_object(page).get("follower_count"))
    if follower_count is not None:
        provider_data["followerCount"] = follower_count
    for source, target in (
        ("broadcaster_type", "broadcasterType"),
        ("created_at", "createdAt"),
        ("offline_image_url", "offlineImageUrl"),
    ):
        value = _as_string(user.get(source))
        if value:
            provider_data[target] = value

    view_count = _as_count(user.get("view_count"))
    if view_count is not None:
        provider_data["viewCount"] = view_count
    return provider_data


def _thumbnail_url(value: object) -> str:
    url = _as_string(value)
    return url.replace("%{width}", "1280").replace("%{height}", "720")


def _extract_video_metadata(
    page: object,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    video = _resource(page, "video")
    video_id = _as_string(video.get("id"))
    if not video_id:
        raise MetadataRequestError("The Twitch video was not found.", 404)

    canonical_url = f"https://www.twitch.tv/videos/{video_id}"
    return {
        "requested_url": requested_url,
        "final_url": canonical_url,
        "provider": provider,
        "http_status": page.status,
        "title": _as_string(video.get("title")) or "Twitch video",
        "description": _as_string(video.get("description")),
        "image_url": _thumbnail_url(video.get("thumbnail_url")),
        "site_name": "Twitch",
        "type": "video.other",
        "canonical_url": canonical_url,
        "favicon_url": _TWITCH_FAVICON,
    }


def _extract_video_provider_data(
    page: object,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    video = _resource(page, "video")
    provider_data: dict[str, object] = {
        "videoId": _as_string(video.get("id")),
        "imageUrl": metadata["image_url"],
    }
    for source, target in (
        ("user_id", "userId"),
        ("user_login", "userLogin"),
        ("user_name", "userName"),
        ("stream_id", "streamId"),
        ("type", "videoType"),
        ("created_at", "createdAt"),
        ("published_at", "publishedAt"),
        ("duration", "duration"),
        ("language", "language"),
        ("url", "url"),
    ):
        value = _as_string(video.get(source))
        if value:
            provider_data[target] = value

    view_count = _as_count(video.get("view_count"))
    if view_count is not None:
        provider_data["viewCount"] = view_count
    thumbnail = _thumbnail_url(video.get("thumbnail_url"))
    if thumbnail:
        provider_data["thumbnailUrl"] = thumbnail
    return provider_data
