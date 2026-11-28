import re
from collections.abc import Mapping
from typing import Literal, TypedDict

FetcherName = Literal["Fetcher", "FetcherSession", "yt-dlp"]


class ExtractedMetadata(TypedDict):
    requested_url: str
    final_url: str
    provider: str
    http_status: int
    title: str
    description: str
    image_url: str
    site_name: str
    type: str
    canonical_url: str
    favicon_url: str


class MetadataResponse(ExtractedMetadata):
    target_type: str | None
    provider_data: dict[str, object]
    fetcher: FetcherName
    is_fallback: bool


def _snake_case_key(key: object) -> str:
    value = str(key)
    value = re.sub(r"([A-Z]+)([A-Z][a-z])", r"\1_\2", value)
    return re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", value).lower()


def _normalize_response_value(value: object) -> object:
    if isinstance(value, Mapping):
        return {
            _snake_case_key(key): _normalize_response_value(item)
            for key, item in value.items()
        }
    if isinstance(value, (list, tuple)):
        return [_normalize_response_value(item) for item in value]
    return value


def _normalize_provider_data(
    provider_data: Mapping[str, object],
) -> dict[str, object]:
    return {
        _snake_case_key(key): _normalize_response_value(value)
        for key, value in provider_data.items()
    }


def build_metadata_response(
    metadata: ExtractedMetadata,
    *,
    fetcher: FetcherName,
    target_type: str | None = None,
    provider_data: Mapping[str, object] | None = None,
    is_fallback: bool = False,
) -> MetadataResponse:
    return {
        **metadata,
        "target_type": target_type,
        "provider_data": _normalize_provider_data(provider_data or {}),
        "fetcher": fetcher,
        "is_fallback": is_fallback,
    }
