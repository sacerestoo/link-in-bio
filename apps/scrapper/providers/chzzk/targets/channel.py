from contracts.source import MetadataSource
from providers.base import ProviderTarget

from ..api import extract_metadata, extract_provider_data, fetch_channel

TARGET = ProviderTarget(
    target_type="channel",
    source=MetadataSource(
        fetch=fetch_channel,
        accepted_content_types=("application/json",),
        extract_metadata=extract_metadata,
        extract_provider_data=extract_provider_data,
    ),
)
