from contracts.source import MetadataSource
from providers.base import ProviderTarget
from sources.fetcher import fetch_page

from ..api import (
    extract_creator_metadata,
    extract_creator_provider_data,
)

TARGET = ProviderTarget(
    target_type="creator",
    source=MetadataSource(
        fetch=fetch_page,
        accepted_content_types=("text/html",),
        extract_metadata=extract_creator_metadata,
        extract_provider_data=extract_creator_provider_data,
    ),
)
