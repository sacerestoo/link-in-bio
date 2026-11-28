from contracts.source import MetadataSource
from providers.base import ProviderTarget

from ..api import extract_metadata, extract_provider_data, fetch_invite

TARGET = ProviderTarget(
    target_type="invite",
    source=MetadataSource(
        fetch=fetch_invite,
        accepted_content_types=("application/json",),
        extract_metadata=extract_metadata,
        extract_provider_data=extract_provider_data,
    ),
)
