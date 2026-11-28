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
        headers={"Accept-Language": "en-US,en;q=0.9"},
        extract_metadata=_extract_profile_metadata,
        extract_provider_data=_extract_profile_provider_data,
    ),
)
