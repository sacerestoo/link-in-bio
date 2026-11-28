from contracts.source import MetadataSource
from providers.base import ProviderTarget
from providers.youtube.api import _api_video, _extract_video_metadata

from ..api import _extract_video_data

TARGET = ProviderTarget(
    target_type="video",
    source=MetadataSource(
        fetch=_api_video,
        accepted_content_types=("application/json",),
        extract_metadata=_extract_video_metadata,
        extract_provider_data=_extract_video_data,
    ),
)
