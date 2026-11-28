import json
import re
from collections.abc import Mapping
from dataclasses import dataclass
from urllib.parse import quote, unquote, urlsplit

from yt_dlp import YoutubeDL
from yt_dlp.utils import DownloadError, ExtractorError

from contracts.errors import MetadataRequestError
from contracts.response import ExtractedMetadata
from sources.fetcher import FetchMode

_HANDLE = re.compile(r"[A-Za-z0-9._]{1,30}")
_VIDEO_ID = re.compile(r"[0-9]{1,40}")
_TIKTOK_FAVICON = "https://www.tiktok.com/favicon.ico"
_YDL_OPTIONS = {
    "quiet": True,
    "no_warnings": True,
    "skip_download": True,
    "noplaylist": True,
    "socket_timeout": 12,
    "retries": 1,
    "extractor_retries": 1,
}


@dataclass(frozen=True, slots=True)
class TikTokPage:
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


def _profile_handle(url: str) -> str:
    segments = [
        unquote(segment) for segment in urlsplit(url).path.split("/") if segment
    ]
    handle = (
        segments[0][1:] if len(segments) == 1 and segments[0].startswith("@") else ""
    )
    if _HANDLE.fullmatch(handle) is None:
        raise MetadataRequestError("The TikTok profile URL is invalid.")
    return handle


def _video_parts(url: str) -> tuple[str, str]:
    segments = [
        unquote(segment) for segment in urlsplit(url).path.split("/") if segment
    ]
    handle = (
        segments[0][1:]
        if len(segments) == 3 and segments[0].startswith("@") and segments[1] == "video"
        else ""
    )
    video_id = segments[2] if handle else ""
    if _HANDLE.fullmatch(handle) is None or _VIDEO_ID.fullmatch(video_id) is None:
        raise MetadataRequestError("The TikTok video URL is invalid.")
    return handle, video_id


def _canonical_url(handle: str, video_id: str | None = None) -> str:
    safe_handle = quote(handle, safe="._")
    if video_id is None:
        return f"https://www.tiktok.com/@{safe_handle}"
    return f"https://www.tiktok.com/@{safe_handle}/video/{video_id}"


def _json_page(url: str, kind: str, data: Mapping[str, object]) -> TikTokPage:
    body = json.dumps({"kind": kind, "data": data}, ensure_ascii=False).encode("utf-8")
    return TikTokPage(
        body=body,
        status=200,
        url=url,
        headers={"content-type": "application/json"},
    )


def _page_payload(page: object, expected_kind: str) -> dict[str, object]:
    body = getattr(page, "body", b"") or b""
    try:
        payload = json.loads(body)
    except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
        raise MetadataRequestError("TikTok returned invalid metadata.", 502) from None
    if not isinstance(payload, dict) or payload.get("kind") != expected_kind:
        raise MetadataRequestError("TikTok returned an invalid response.", 502)
    data = payload.get("data")
    if not isinstance(data, dict):
        raise MetadataRequestError("TikTok returned an incomplete response.", 502)
    return data


def _profile_user_detail(extractor, profile_url: str, handle: str):
    headers = extractor._generate_blockbuster_headers()
    webpage = (
        extractor._download_webpage(
            profile_url,
            handle,
            "Downloading TikTok profile",
            "Unable to download TikTok profile",
            fatal=False,
            impersonate=True,
            headers=headers,
        )
        or ""
    )
    universal_data = extractor._get_universal_data(webpage, handle)
    detail = _as_mapping(universal_data.get("webapp.user-detail"))
    if detail:
        return detail

    if not webpage:
        raise MetadataRequestError("TikTok did not return profile data.", 502)

    try:
        challenge_cookies = extractor._solve_challenge_and_set_cookies(webpage)
    except ExtractorError:
        raise MetadataRequestError("TikTok profile data is unavailable.", 502) from None

    try:
        webpage = (
            extractor._download_webpage(
                profile_url,
                handle,
                "Downloading TikTok profile with challenge cookie",
                "Unable to download TikTok profile",
                fatal=False,
                impersonate=True,
                headers=headers,
            )
            or ""
        )
    finally:
        for cookie_name in filter(None, challenge_cookies):
            extractor.cookiejar.clear(
                domain=".tiktok.com",
                path="/",
                name=cookie_name,
            )

    universal_data = extractor._get_universal_data(webpage, handle)
    detail = _as_mapping(universal_data.get("webapp.user-detail"))
    if not detail:
        raise MetadataRequestError("TikTok profile data is unavailable.", 502)
    return detail


def _fetch_profile(
    url: str,
    mode: FetchMode,
    headers: Mapping[str, str] | None = None,
) -> TikTokPage:
    del mode, headers
    handle = _profile_handle(url)
    profile_url = _canonical_url(handle)
    try:
        with YoutubeDL(_YDL_OPTIONS) as ydl:
            extractor = ydl.get_info_extractor("TikTokUser")
            extractor.initialize()
            detail = _profile_user_detail(extractor, profile_url, handle)
    except MetadataRequestError:
        raise
    except (DownloadError, ExtractorError, OSError, TimeoutError):
        raise MetadataRequestError(
            "TikTok profile metadata could not be extracted.", 502
        ) from None

    user_info = _as_mapping(detail.get("userInfo"))
    user = _as_mapping(user_info.get("user"))
    stats = _as_mapping(user_info.get("stats"))
    stats_v2 = _as_mapping(user_info.get("statsV2"))
    username = _as_string(user.get("uniqueId")) or handle
    bio = _as_string(user.get("signature"))
    avatar_url = (
        _as_string(user.get("avatarLarger"))
        or _as_string(user.get("avatarMedium"))
        or _as_string(user.get("avatarThumb"))
    )
    follower_count = _as_count(stats.get("followerCount"))
    if follower_count is None:
        follower_count = _as_count(stats_v2.get("followerCount"))
    if not avatar_url.startswith("https://") or follower_count is None:
        raise MetadataRequestError("TikTok returned incomplete profile data.", 502)

    profile: dict[str, object] = {
        "username": username,
        "display_name": _as_string(user.get("nickname")) or f"@{username}",
        "bio": bio,
        "avatar_url": avatar_url,
        "follower_count": follower_count,
    }
    user_id = _as_string(user.get("id"))
    if user_id:
        profile["user_id"] = user_id
    for source_key, result_key in (
        ("followingCount", "following_count"),
        ("heartCount", "heart_count"),
        ("videoCount", "video_count"),
    ):
        count = _as_count(stats.get(source_key))
        if count is None:
            count = _as_count(stats_v2.get(source_key))
        if count is not None:
            profile[result_key] = count
    for source_key, result_key in (
        ("verified", "verified"),
        ("privateAccount", "private_account"),
    ):
        value = user.get(source_key)
        if isinstance(value, bool):
            profile[result_key] = value

    return _json_page(_canonical_url(username), "profile", profile)


def _fetch_video(
    url: str,
    mode: FetchMode,
    headers: Mapping[str, str] | None = None,
) -> TikTokPage:
    del mode, headers
    handle, video_id = _video_parts(url)
    video_url = _canonical_url(handle, video_id)
    try:
        with YoutubeDL(_YDL_OPTIONS) as ydl:
            info = ydl.extract_info(video_url, download=False)
    except (DownloadError, ExtractorError, OSError, TimeoutError):
        raise MetadataRequestError(
            "TikTok video metadata could not be extracted.", 502
        ) from None

    video = _as_mapping(info)
    if _as_string(video.get("id")) != video_id:
        raise MetadataRequestError("TikTok returned a different video.", 502)
    extracted: dict[str, object] = {
        "video_id": video_id,
        "title": _as_string(video.get("title")) or f"TikTok video {video_id}",
        "description": _as_string(video.get("description")),
        "thumbnail_url": _as_string(video.get("thumbnail")),
        "username": _as_string(video.get("uploader")) or handle,
        "display_name": (
            _as_string(video.get("channel"))
            or _as_string(video.get("uploader"))
            or handle
        ),
    }
    uploader_id = _as_string(video.get("uploader_id"))
    if uploader_id:
        extracted["user_id"] = uploader_id
    channel_id = _as_string(video.get("channel_id"))
    if channel_id:
        extracted["channel_id"] = channel_id
    for source_key, result_key in (
        ("duration", "duration"),
        ("timestamp", "timestamp"),
        ("view_count", "view_count"),
        ("like_count", "like_count"),
        ("comment_count", "comment_count"),
        ("repost_count", "share_count"),
    ):
        value = video.get(source_key)
        if (
            isinstance(value, (int, float))
            and not isinstance(value, bool)
            and value >= 0
        ):
            extracted[result_key] = value
    upload_date = _as_string(video.get("upload_date"))
    if upload_date:
        extracted["upload_date"] = upload_date
    return _json_page(video_url, "video", extracted)


def _extract_profile_metadata(
    page: object,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    profile = _page_payload(page, "profile")
    canonical_url = _as_string(getattr(page, "url", None)) or final_url
    username = _as_string(profile.get("username"))
    return {
        "requested_url": requested_url,
        "final_url": canonical_url,
        "provider": provider,
        "http_status": page.status,
        "title": _as_string(profile.get("display_name")) or f"@{username}",
        "description": _as_string(profile.get("bio")),
        "image_url": _as_string(profile.get("avatar_url")),
        "site_name": "TikTok",
        "type": "profile",
        "canonical_url": canonical_url,
        "favicon_url": _TIKTOK_FAVICON,
    }


def _extract_profile_provider_data(
    page: object,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    del metadata
    return dict(_page_payload(page, "profile"))


def _extract_video_metadata(
    page: object,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    video = _page_payload(page, "video")
    canonical_url = _as_string(getattr(page, "url", None)) or final_url
    return {
        "requested_url": requested_url,
        "final_url": canonical_url,
        "provider": provider,
        "http_status": page.status,
        "title": _as_string(video.get("title")),
        "description": _as_string(video.get("description")),
        "image_url": _as_string(video.get("thumbnail_url")),
        "site_name": "TikTok",
        "type": "video",
        "canonical_url": canonical_url,
        "favicon_url": _TIKTOK_FAVICON,
    }


def _extract_video_provider_data(
    page: object,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    del metadata
    return dict(_page_payload(page, "video"))
