from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from contracts.response import ExtractedMetadata
from contracts.source import (
    MetadataExtractor,
    MetadataSource,
    PageFetcher,
    ProviderDataExtractor,
)
from routing.types import Target
from sources.fetcher import fetch_page
from sources.html_metadata import extract_metadata


def _no_provider_data(page: Any, metadata: ExtractedMetadata) -> dict[str, object]:
    return {}


@dataclass(frozen=True, slots=True)
class SelectedMetadataSource:
    fetch: PageFetcher
    headers: Mapping[str, str] | None
    accepted_content_types: tuple[str, ...]
    extract_metadata: MetadataExtractor
    extract_provider_data: ProviderDataExtractor


def select_source(target: Target) -> SelectedMetadataSource:
    """Resolve a target's optional source behavior with shared defaults."""
    source: MetadataSource | None = target.source
    return SelectedMetadataSource(
        fetch=(source.fetch if source and source.fetch else fetch_page),
        headers=source.headers if source else None,
        accepted_content_types=(
            source.accepted_content_types
            if source and source.accepted_content_types
            else ("text/html", "application/xhtml+xml")
        ),
        extract_metadata=(
            source.extract_metadata
            if source and source.extract_metadata
            else extract_metadata
        ),
        extract_provider_data=(
            source.extract_provider_data
            if source and source.extract_provider_data
            else _no_provider_data
        ),
    )
