import json
import re
from collections.abc import Mapping
from dataclasses import dataclass

from contracts.errors import MetadataRequestError, UpstreamResponseError
from contracts.response import ExtractedMetadata
from contracts.settings import MAX_HTML_BYTES
from providers.youtube.api import (
    _extract_channel_provider_data,
    _extract_video_provider_data,
)
from sources.fetcher import FetchMode, fetch_page, post_page

_API_BASE_URL = "https://music.youtube.com/youtubei/v1"
_CLIENT_NAME_ID = "67"  # WEB_REMIX
_CONFIG_PATTERN = re.compile(r"ytcfg\.set\((\{.*?\})\);", re.S)


@dataclass(frozen=True, slots=True)
class YouTubeMusicPage:
    body: bytes
    status: int
    url: str
    headers: Mapping[str, str]
    html_page: object
    api_data: dict[str, dict[str, object]]


def _mapping(value: object) -> Mapping[str, object]:
    return value if isinstance(value, Mapping) else {}


def _config(page: object) -> dict[str, object]:
    body = getattr(page, "body", b"") or b""
    html = body.decode("utf-8", "replace") if isinstance(body, bytes) else str(body)
    for match in _CONFIG_PATTERN.finditer(html):
        try:
            config = json.loads(match.group(1))
        except json.JSONDecodeError:
            continue
        if isinstance(config, dict) and config.get("INNERTUBE_API_KEY"):
            return config
    raise MetadataRequestError("YouTube Music page data could not be read.", 502)


def _decode_initial_endpoint(config: Mapping[str, object]) -> dict[str, object]:
    value = config.get("INITIAL_ENDPOINT")
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            value = None
    if not isinstance(value, dict):
        raise MetadataRequestError("YouTube Music page data could not be read.", 502)
    return value


def _api_request(
    endpoint: str,
    payload: Mapping[str, object],
    config: Mapping[str, object],
    mode: FetchMode,
    referer: str,
):
    context = _mapping(config.get("INNERTUBE_CONTEXT"))
    client = _mapping(context.get("client"))
    api_key = str(config.get("INNERTUBE_API_KEY", ""))
    client_version = str(config.get("INNERTUBE_CLIENT_VERSION", ""))
    if not api_key or not client_version or not context:
        raise MetadataRequestError("YouTube Music page data could not be read.", 502)

    request_payload = {"context": context, **payload}
    request_url = f"{_API_BASE_URL}/{endpoint}"
    response = post_page(
        request_url,
        mode,
        request_payload,
        headers={
            "X-Goog-Api-Key": api_key,
            "X-Goog-Visitor-Id": str(client.get("visitorData", "")),
            "X-Youtube-Client-Name": _CLIENT_NAME_ID,
            "X-Youtube-Client-Version": client_version,
            "Origin": "https://music.youtube.com",
            "Referer": referer,
        },
    )
    if not 200 <= response.status < 300:
        raise UpstreamResponseError(response.status)

    body = getattr(response, "body", b"") or b""
    if len(body) > MAX_HTML_BYTES:
        raise MetadataRequestError("The YouTube Music response is too large.", 413)
    try:
        data = json.loads(body)
    except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
        raise MetadataRequestError(
            "YouTube Music returned invalid JSON.", 502
        ) from None
    if not isinstance(data, dict):
        raise MetadataRequestError("YouTube Music returned invalid data.", 502)
    return data


def fetch_youtube_music_page(
    url: str,
    mode: FetchMode,
    headers: Mapping[str, str] | None = None,
):
    html_page = fetch_page(url, mode, headers)
    if not 200 <= html_page.status < 300:
        return html_page

    config = _config(html_page)
    initial_endpoint = _decode_initial_endpoint(config)
    api_data: dict[str, dict[str, object]] = {}

    browse_endpoint = _mapping(initial_endpoint.get("browseEndpoint"))
    if browse_endpoint:
        payload = {
            key: browse_endpoint[key]
            for key in ("browseId", "params")
            if key in browse_endpoint
        }
        api_data["browse"] = _api_request(
            "browse", payload, config, mode, html_page.url
        )
    else:
        watch_endpoint = _mapping(initial_endpoint.get("watchEndpoint"))
        video_id = watch_endpoint.get("videoId")
        if not isinstance(video_id, str) or not video_id:
            raise MetadataRequestError(
                "YouTube Music page data could not be read.", 502
            )
        api_data["player"] = _api_request(
            "player", {"videoId": video_id}, config, mode, html_page.url
        )
        api_data["next"] = _api_request(
            "next", {"videoId": video_id}, config, mode, html_page.url
        )

    return YouTubeMusicPage(
        body=html_page.body,
        status=html_page.status,
        url=html_page.url,
        headers=html_page.headers,
        html_page=html_page,
        api_data=api_data,
    )


def _extract_channel_data(
    page: object, metadata: ExtractedMetadata
) -> dict[str, object]:
    provider_data = _extract_channel_provider_data(page, metadata)
    if "subscriberCount" in provider_data:
        provider_data["subscriberCountApproximate"] = True
    if metadata["image_url"]:
        channel_avatar_url = provider_data.pop("channelImageUrl", None)
        if isinstance(channel_avatar_url, str) and channel_avatar_url:
            provider_data["channelAvatarUrl"] = channel_avatar_url
        provider_data["channelImageUrl"] = metadata["image_url"]
    return provider_data


def _extract_video_data(page: object, metadata: ExtractedMetadata) -> dict[str, object]:
    provider_data = _extract_video_provider_data(page, metadata)
    if metadata["image_url"]:
        provider_data["videoImageUrl"] = metadata["image_url"]
    return provider_data
