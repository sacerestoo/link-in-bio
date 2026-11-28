from contracts.source import MetadataSource
from providers.base import ProviderTarget

from ..api import (
    _extract_profile_metadata,
    _fetch_profile,
    extract_profile_provider_data,
)

TARGET = ProviderTarget(
    target_type="profile",
    source=MetadataSource(
        fetch=_fetch_profile,
        extract_metadata=_extract_profile_metadata,
        extract_provider_data=extract_profile_provider_data,
    ),
)
