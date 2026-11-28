from contracts.source import MetadataSource
from providers.base import ProviderTarget

from ..api import (
    _extract_profile_metadata,
    _extract_profile_provider_data,
    _fetch_profile,
)

TARGET = ProviderTarget(
    target_type="profile",
    source=MetadataSource(
        fetch=_fetch_profile,
        accepted_content_types=("application/json",),
        fetcher_name="yt-dlp",
        extract_metadata=_extract_profile_metadata,
        extract_provider_data=_extract_profile_provider_data,
    ),
)
