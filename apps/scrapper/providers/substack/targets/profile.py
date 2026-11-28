from contracts.source import MetadataSource
from providers.base import ProviderTarget

from ..api import extract_profile_metadata, extract_profile_provider_data

TARGET = ProviderTarget(
    target_type="profile",
    source=MetadataSource(
        extract_metadata=extract_profile_metadata,
        extract_provider_data=extract_profile_provider_data,
    ),
)
