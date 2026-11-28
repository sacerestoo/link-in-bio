import json
import re
from collections.abc import Mapping
from urllib.parse import urlsplit

from contracts.errors import MetadataRequestError
from contracts.response import ExtractedMetadata
from sources.fetcher import FetchMode, fetch_page

_API_BASE_URL = "https://api-channel.sooplive.com/v1.1/channel"
_USER_ID = re.compile(r"[A-Za-z0-9_.-]{1,64}")
_FAVICON_URL = "https://res.sooplive.com/favicon.ico"


def _user_id(url: str) -> str:
    segments = [segment for segment in urlsplit(url).path.split("/") if segment]
    user_id = segments[-1] if segments else ""
    if _USER_ID.fullmatch(user_id) is None:
        raise MetadataRequestError("The SOOP station URL is invalid.")
    return user_id


def fetch_channel(url: str, mode: FetchMode, headers=None):
    user_id = _user_id(url)
    return fetch_page(
        f"{_API_BASE_URL}/{user_id}/station",
        mode,
        headers={"Accept": "application/json"},
    )


def _payload(page: object) -> dict[str, object]:
    body = getattr(page, "body", b"") or b""
    try:
        payload = json.loads(body)
    except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
        raise MetadataRequestError(
            "The SOOP station endpoint returned invalid JSON.",
            502,
        ) from None
    if not isinstance(payload, dict):
        raise MetadataRequestError(
            "The SOOP station endpoint returned an invalid response.",
            502,
        )
    return payload


def _mapping(value: object) -> Mapping[str, object]:
    return value if isinstance(value, dict) else {}


def _string(value: object) -> str:
    return value if isinstance(value, str) else ""


def _station(
    page: object, requested_url: str
) -> tuple[
    dict[str, object],
    Mapping[str, object],
    Mapping[str, object],
]:
    payload = _payload(page)
    station = _mapping(payload.get("station"))
    if not station:
        raise MetadataRequestError("The SOOP station was not found.", 404)
    if _string(station.get("userId")) != _user_id(requested_url):
        raise MetadataRequestError("The SOOP station was not found.", 404)
    return (
        dict(station),
        _mapping(payload.get("display")),
        _mapping(payload.get("upd")),
    )


def _canonical_url(requested_url: str) -> str:
    user_id = _user_id(requested_url)
    return f"https://www.sooplive.com/station/{user_id}"


def extract_metadata(
    page: object,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    station, display, _ = _station(page, requested_url)
    user_name = _string(station.get("userNick"))
    station_name = _string(station.get("stationName"))
    profile_text = _string(display.get("profileText"))
    station_title = _string(station.get("stationTitle"))
    image_url = _string(station.get("profileImage"))
    canonical_url = _canonical_url(requested_url)

    return {
        "requested_url": requested_url,
        "final_url": canonical_url,
        "provider": provider,
        "http_status": page.status,
        "title": f"{user_name or station_name or 'SOOP'}의 방송국 | SOOP",
        "description": profile_text or station_title,
        "image_url": image_url,
        "site_name": "SOOP",
        "type": "profile",
        "canonical_url": canonical_url,
        "favicon_url": _FAVICON_URL,
    }


def extract_provider_data(
    page: object,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    station, display, update_data = _station(page, metadata["requested_url"])
    provider_data: dict[str, object] = {
        "userId": _string(station.get("userId")),
        "userName": _string(station.get("userNick")),
        "stationName": _string(station.get("stationName")),
        "stationTitle": _string(station.get("stationTitle")),
        "profileText": _string(display.get("profileText")),
        "profileImage": _string(station.get("profileImage")),
    }
    station_no = station.get("stationNo")
    if isinstance(station_no, int) and not isinstance(station_no, bool):
        provider_data["stationNo"] = station_no
    favorite_count = update_data.get("fanCnt")
    if isinstance(favorite_count, int) and not isinstance(favorite_count, bool):
        provider_data["favoriteCount"] = favorite_count
    return provider_data
