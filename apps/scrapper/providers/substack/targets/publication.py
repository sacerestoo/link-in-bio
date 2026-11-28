from contracts.source import MetadataSource
from providers.base import ProviderTarget

from ..api import (
    accepted_feed_types,
    extract_feed_metadata,
    extract_publication_provider_data,
    fetch_feed,
)

TARGET = ProviderTarget(
    target_type="publication",
    source=MetadataSource(
        fetch=fetch_feed,
        accepted_content_types=accepted_feed_types,
        extract_metadata=extract_feed_metadata,
        extract_provider_data=extract_publication_provider_data,
    ),
)
