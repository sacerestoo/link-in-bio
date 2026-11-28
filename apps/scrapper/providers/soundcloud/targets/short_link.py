from contracts.source import MetadataSource
from providers.base import ProviderTarget

from ..source import (
    extract_short_link_provider_data,
    extract_soundcloud_metadata,
    fetch_soundcloud_page,
    soundcloud_target_type,
)

TARGET = ProviderTarget(
    target_type="short_link",
    source=MetadataSource(
        fetch=fetch_soundcloud_page,
        extract_metadata=extract_soundcloud_metadata,
        extract_provider_data=extract_short_link_provider_data,
        resolve_target_type=soundcloud_target_type,
    ),
)
