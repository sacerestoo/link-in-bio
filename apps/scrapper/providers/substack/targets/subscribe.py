from contracts.source import MetadataSource
from providers.base import ProviderTarget

from ..api import extract_subscribe_metadata, extract_subscribe_provider_data

TARGET = ProviderTarget(
    target_type="subscribe",
    source=MetadataSource(
        extract_metadata=extract_subscribe_metadata,
        extract_provider_data=extract_subscribe_provider_data,
    ),
)
