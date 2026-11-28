from contracts.source import MetadataSource
from providers.base import ProviderTarget

from ..api import _extract_metadata, _extract_provider_data, _fetch_tweet

TARGET = ProviderTarget(
    target_type="tweet",
    source=MetadataSource(
        fetch=_fetch_tweet,
        accepted_content_types=("application/json",),
        extract_metadata=_extract_metadata,
        extract_provider_data=_extract_provider_data,
    ),
)
