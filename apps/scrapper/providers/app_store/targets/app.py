from contracts.source import MetadataSource
from providers.base import ProviderTarget

from ..api import extract_metadata, extract_provider_data, fetch_app

TARGET = ProviderTarget(
    target_type="app",
    source=MetadataSource(
        fetch=fetch_app,
        accepted_content_types=("application/json",),
        extract_metadata=extract_metadata,
        extract_provider_data=extract_provider_data,
    ),
)
