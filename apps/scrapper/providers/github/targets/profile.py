from contracts.source import MetadataSource
from providers.base import ProviderTarget

from ..api import extract_profile_metadata, extract_profile_provider_data, fetch_profile

TARGET = ProviderTarget(
    target_type="profile",
    source=MetadataSource(
        fetch=fetch_profile,
        accepted_content_types=("application/json",),
        extract_metadata=extract_profile_metadata,
        extract_provider_data=extract_profile_provider_data,
    ),
)
