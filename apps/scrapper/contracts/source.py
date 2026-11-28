from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any

from contracts.response import ExtractedMetadata

PageFetcher = Callable[..., Any]
MetadataExtractor = Callable[[Any, str, str, str], ExtractedMetadata]
ProviderDataExtractor = Callable[[Any, ExtractedMetadata], dict[str, object]]


@dataclass(frozen=True, slots=True)
class MetadataSource:
    """Optional source behavior declared by a provider target."""

    fetch: PageFetcher | None = None
    headers: Mapping[str, str] | None = None
    accepted_content_types: tuple[str, ...] | None = None
    extract_metadata: MetadataExtractor | None = None
    extract_provider_data: ProviderDataExtractor | None = None
