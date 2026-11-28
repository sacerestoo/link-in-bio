from contracts.source import MetadataSource
from providers.base import ProviderTarget

from ..api import _extract_profile_provider_data

TARGET = ProviderTarget(
    target_type="profile",
    source=MetadataSource(extract_provider_data=_extract_profile_provider_data),
)
