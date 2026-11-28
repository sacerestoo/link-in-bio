from contracts.source import MetadataSource
from providers.base import ProviderTarget
from providers.youtube.api import _api_channel, _extract_channel_metadata

from ..api import _extract_channel_data

TARGET = ProviderTarget(
    target_type="channel",
    source=MetadataSource(
        fetch=_api_channel,
        accepted_content_types=("application/json",),
        extract_metadata=_extract_channel_metadata,
        extract_provider_data=_extract_channel_data,
    ),
)
