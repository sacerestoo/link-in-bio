import json
from collections.abc import Mapping
from dataclasses import dataclass
from urllib.parse import urlencode, urlsplit

from contracts.errors import MetadataRequestError
from contracts.response import ExtractedMetadata
from sources.fetcher import FetchMode, fetch_page

_LOOKUP_URL = "https://itunes.apple.com/lookup"
_FAVICON_URL = "https://apps.apple.com/favicon.ico"


@dataclass(frozen=True, slots=True)
class AppStorePage:
    body: bytes
    status: int
    url: str
    headers: Mapping[str, str]
    record: Mapping[str, object]


def _app_identity(url: str) -> tuple[str, str]:
    parsed = urlsplit(url)
    segments = [segment for segment in parsed.path.split("/") if segment]
    app_segment = segments[-1] if segments else ""
    app_id = app_segment.removeprefix("id")
    country = segments[0].split("-")[-1].casefold() if segments else ""
    if not app_id.isdigit() or len(country) != 2 or not country.isalpha():
        raise MetadataRequestError("The App Store app URL is invalid.")
    return app_id, country


def _decode_record(body: bytes) -> Mapping[str, object]:
    try:
        payload = json.loads(body)
    except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
        raise MetadataRequestError(
            "The App Store API returned invalid JSON.", 502
        ) from None

    if not isinstance(payload, dict):
        raise MetadataRequestError(
            "The App Store API returned an invalid response.", 502
        )
    results = payload.get("results")
    if not isinstance(results, list):
        raise MetadataRequestError(
            "The App Store API returned an invalid response.", 502
        )
    if not results:
        raise MetadataRequestError("The App Store app was not found.", 404)
    record = results[0]
    if not isinstance(record, dict):
        raise MetadataRequestError("The App Store API returned an invalid app.", 502)
    return record


def fetch_app(
    url: str,
    mode: FetchMode,
    headers: Mapping[str, str] | None = None,
) -> AppStorePage:
    app_id, country = _app_identity(url)
    lookup_url = f"{_LOOKUP_URL}?{urlencode({'id': app_id, 'country': country})}"
    response = fetch_page(
        lookup_url,
        mode,
        headers={**(headers or {}), "Accept": "application/json"},
    )
    body = response.body or b""
    record = _decode_record(body) if 200 <= response.status < 300 else {}
    return AppStorePage(
        body=body,
        status=response.status,
        url=url,
        headers={"content-type": "application/json"},
        record=record,
    )


def _as_string(value: object) -> str:
    return value if isinstance(value, str) else ""


def _as_number(value: object) -> int | float | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return value
    return None


def _as_string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [item for item in value if isinstance(item, str) and item]


def extract_metadata(
    page: AppStorePage,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    record = page.record
    title = _as_string(record.get("trackName"))
    canonical_url = _as_string(record.get("trackViewUrl")) or final_url or requested_url
    image_url = (
        _as_string(record.get("artworkUrl512"))
        or _as_string(record.get("artworkUrl100"))
        or _as_string(record.get("artworkUrl60"))
    )
    return {
        "requested_url": requested_url,
        "final_url": canonical_url,
        "provider": provider,
        "http_status": page.status,
        "title": title[:500],
        "description": _as_string(record.get("description"))[:2000],
        "image_url": image_url,
        "site_name": "App Store",
        "type": "software",
        "canonical_url": canonical_url,
        "favicon_url": _FAVICON_URL,
    }


def extract_provider_data(
    page: AppStorePage,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    record = page.record
    provider_data: dict[str, object] = {"app_name": metadata["title"]}
    string_fields = {
        "bundle_id": "bundleId",
        "developer_name": "sellerName",
        "developer_url": "sellerUrl",
        "price_formatted": "formattedPrice",
        "currency": "currency",
        "category": "primaryGenreName",
        "version": "version",
        "minimum_os_version": "minimumOsVersion",
        "content_rating": "contentAdvisoryRating",
        "release_date": "releaseDate",
        "current_version_release_date": "currentVersionReleaseDate",
    }
    for output_key, source_key in string_fields.items():
        value = _as_string(record.get(source_key))
        if value:
            provider_data[output_key] = value

    app_id = _as_number(record.get("trackId"))
    if app_id is not None:
        provider_data["app_id"] = app_id

    rating = _as_number(record.get("averageUserRating"))
    if rating is not None:
        provider_data["rating"] = rating

    rating_count = _as_number(record.get("userRatingCount"))
    if rating_count is not None:
        provider_data["rating_count"] = rating_count

    price = _as_number(record.get("price"))
    if price is not None:
        provider_data["price"] = price

    screenshots = _as_string_list(record.get("screenshotUrls"))
    if screenshots:
        provider_data["screenshots"] = screenshots

    ipad_screenshots = _as_string_list(record.get("ipadScreenshotUrls"))
    if ipad_screenshots:
        provider_data["ipad_screenshots"] = ipad_screenshots

    return provider_data
