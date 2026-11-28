from contracts.source import MetadataSource
from providers.base import ProviderTarget

from ..api import (
    _api_profile,
    _extract_profile_metadata,
    _extract_profile_provider_data,
)

TARGET = ProviderTarget(
    target_type="profile",
    source=MetadataSource(
        fetch=_api_profile,
        accepted_content_types=("application/json",),
        extract_metadata=_extract_profile_metadata,
        extract_provider_data=_extract_profile_provider_data,
    ),
)
