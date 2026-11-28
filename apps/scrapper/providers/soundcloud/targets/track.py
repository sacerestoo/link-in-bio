from contracts.source import MetadataSource
from providers.base import ProviderTarget

from ..source import (
    extract_soundcloud_metadata,
    extract_track_provider_data,
    fetch_soundcloud_page,
)

TARGET = ProviderTarget(
    target_type="track",
    source=MetadataSource(
        fetch=fetch_soundcloud_page,
        extract_metadata=extract_soundcloud_metadata,
        extract_provider_data=extract_track_provider_data,
    ),
)
