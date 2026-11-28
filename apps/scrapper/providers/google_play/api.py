import json
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any
from urllib.parse import parse_qs, urljoin, urlsplit

from contracts.errors import MetadataRequestError
from contracts.response import ExtractedMetadata
from sources.fetcher import FetchMode, fetch_page
from sources.html_metadata import extract_metadata as extract_html_metadata

_FAVICON_URL = "https://play.google.com/favicon.ico"


@dataclass(frozen=True, slots=True)
class GooglePlayPage:
    body: bytes
    status: int
    url: str
    headers: Mapping[str, str]
    html_page: Any
    package_name: str
    record: Mapping[str, object]


def _package_name(url: str) -> str:
    package_names = parse_qs(urlsplit(url).query).get("id", [])
    package_name = package_names[0].strip() if package_names else ""
    if not package_name:
        raise MetadataRequestError("The Google Play app URL is invalid.")
    return package_name


def _software_application(value: object) -> Mapping[str, object] | None:
    if isinstance(value, list):
        return next(
            (
                record
                for item in value
                if (record := _software_application(item)) is not None
            ),
            None,
        )
    if not isinstance(value, dict):
        return None

    app_type = value.get("@type")
    if app_type == "SoftwareApplication" or (
        isinstance(app_type, list) and "SoftwareApplication" in app_type
    ):
        return value

    graph = value.get("@graph")
    return _software_application(graph)


def _record_package_name(record: Mapping[str, object]) -> str:
    app_url = _as_string(record.get("url"))
    package_names = parse_qs(urlsplit(app_url).query).get("id", [])
    return package_names[0] if package_names else ""


def _json_ld_records(page: Any) -> list[Mapping[str, object]]:
    records: list[Mapping[str, object]] = []
    for content in page.css('script[type="application/ld+json"]::text').getall():
        try:
            payload = json.loads(content)
        except (TypeError, json.JSONDecodeError):
            continue
        record = _software_application(payload)
        if record is not None:
            records.append(record)
    return records


def fetch_app(
    url: str,
    mode: FetchMode,
    headers: Mapping[str, str] | None = None,
) -> GooglePlayPage:
    package_name = _package_name(url)
    page = fetch_page(
        url,
        mode,
        headers={**(headers or {}), "Accept-Language": "en-US,en;q=0.9"},
    )
    records = _json_ld_records(page) if 200 <= page.status < 300 else []
    record = next(
        (item for item in records if _record_package_name(item) == package_name),
        None,
    )
    if record is None and len(records) == 1:
        record = records[0]
    if record is None and 200 <= page.status < 300:
        raise MetadataRequestError("Google Play app details could not be read.", 502)
    return GooglePlayPage(
        body=page.body or b"",
        status=page.status,
        url=page.url,
        headers=page.headers,
        html_page=page,
        package_name=package_name,
        record=record or {},
    )


def _as_mapping(value: object) -> Mapping[str, object]:
    return value if isinstance(value, Mapping) else {}


def _as_string(value: object) -> str:
    return value if isinstance(value, str) else ""


def _as_string_or_list_first(value: object) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return next((item for item in value if isinstance(item, str)), "")
    return ""


def _as_number(value: object) -> int | float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, str):
        try:
            return float(value) if "." in value else int(value)
        except ValueError:
            return None
    return None


def extract_metadata(
    page: GooglePlayPage,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    metadata = extract_html_metadata(
        page.html_page,
        requested_url,
        final_url,
        provider,
    )
    record = page.record
    title = _as_string(record.get("name")) or metadata["title"]
    description = _as_string(record.get("description")) or metadata["description"]
    image_url = _as_string_or_list_first(record.get("image")) or metadata["image_url"]
    if image_url:
        image_url = urljoin(final_url, image_url)
    canonical_url = metadata["canonical_url"] or _as_string(record.get("url"))

    return {
        **metadata,
        "final_url": final_url,
        "title": title[:500],
        "description": description[:2000],
        "image_url": image_url,
        "site_name": "Google Play",
        "type": "software",
        "canonical_url": canonical_url,
        "favicon_url": _FAVICON_URL,
    }


def extract_provider_data(
    page: GooglePlayPage,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    record = page.record
    author = _as_mapping(record.get("author"))
    rating = _as_mapping(record.get("aggregateRating"))
    offers = record.get("offers")
    offer = _as_mapping(offers[0] if isinstance(offers, list) and offers else offers)

    provider_data: dict[str, object] = {
        "app_name": metadata["title"],
        "package_name": page.package_name,
    }
    string_fields = {
        "developer_name": _as_string(author.get("name")),
        "developer_url": _as_string(author.get("url")),
        "category": _as_string(record.get("applicationCategory")),
        "content_rating": _as_string(record.get("contentRating")),
        "operating_system": _as_string(record.get("operatingSystem")),
        "price_currency": _as_string(offer.get("priceCurrency")),
    }
    provider_data.update({key: value for key, value in string_fields.items() if value})

    rating_value = _as_number(rating.get("ratingValue"))
    if rating_value is not None:
        provider_data["rating"] = rating_value

    rating_count = _as_number(rating.get("ratingCount"))
    if rating_count is not None:
        provider_data["rating_count"] = rating_count

    price = _as_number(offer.get("price"))
    if price is not None:
        provider_data["price"] = price

    return provider_data
