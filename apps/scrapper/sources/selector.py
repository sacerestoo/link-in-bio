from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any

from contracts.errors import MetadataRequestError
from contracts.response import ExtractedMetadata, FetcherName
from contracts.source import (
    MetadataExtractor,
    MetadataSource,
    PageFetcher,
    ProviderDataExtractor,
)
from providers.base import ProviderTarget
from providers.registry import GENERIC_PROVIDER, PROVIDERS
from sources.fetcher import fetch_page
from sources.html_metadata import extract_metadata


def _no_provider_data(page: Any, metadata: ExtractedMetadata) -> dict[str, object]:
    return {}


@dataclass(frozen=True, slots=True)
class SelectedMetadataSource:
    fetch: PageFetcher
    headers: Mapping[str, str] | None
    accepted_content_types: tuple[str, ...]
    fetcher_name: FetcherName | None
    extract_metadata: MetadataExtractor
    extract_provider_data: ProviderDataExtractor
    resolve_target_type: Callable[[Any, ExtractedMetadata], str | None] | None


def select_source(provider: object, target_type: object) -> SelectedMetadataSource:
    """Select a provider handler using the route supplied by the API server."""
    if not isinstance(provider, str) or not isinstance(target_type, str):
        raise MetadataRequestError("provider and target must be strings.")

    providers = (*PROVIDERS, GENERIC_PROVIDER)
    provider_definition = next(
        (item for item in providers if item.provider == provider),
        None,
    )
    if provider_definition is None:
        raise MetadataRequestError("The requested provider is not supported.")

    target: ProviderTarget | None = next(
        (
            item
            for item in provider_definition.targets
            if item.target_type == target_type
        ),
        None,
    )
    if target is None and target_type == "webpage":
        target = next(
            (
                item
                for item in GENERIC_PROVIDER.targets
                if item.target_type == "webpage"
            ),
            None,
        )
    if target is None:
        raise MetadataRequestError("The requested provider target is not supported.")

    source: MetadataSource | None = target.source
    return SelectedMetadataSource(
        fetch=(source.fetch if source and source.fetch else fetch_page),
        headers=source.headers if source else None,
        accepted_content_types=(
            source.accepted_content_types
            if source and source.accepted_content_types
            else ("text/html", "application/xhtml+xml")
        ),
        fetcher_name=source.fetcher_name if source else None,
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
        resolve_target_type=(source.resolve_target_type if source else None),
    )
