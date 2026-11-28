from contracts.source import MetadataSource
from providers.base import ProviderTarget

from ..api import extract_post_metadata, extract_post_provider_data

TARGET = ProviderTarget(
    target_type="post",
    source=MetadataSource(
        extract_metadata=extract_post_metadata,
        extract_provider_data=extract_post_provider_data,
    ),
)
