from contracts.source import MetadataSource
from providers.base import ProviderTarget

from ..source import (
    extract_playlist_provider_data,
    extract_soundcloud_metadata,
    fetch_soundcloud_page,
)

TARGET = ProviderTarget(
    target_type="playlist",
    source=MetadataSource(
        fetch=fetch_soundcloud_page,
        extract_metadata=extract_soundcloud_metadata,
        extract_provider_data=extract_playlist_provider_data,
    ),
)
