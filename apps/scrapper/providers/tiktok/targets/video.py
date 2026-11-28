from contracts.source import MetadataSource
from providers.base import ProviderTarget

from ..api import (
    _extract_video_metadata,
    _extract_video_provider_data,
    _fetch_video,
)

TARGET = ProviderTarget(
    target_type="video",
    source=MetadataSource(
        fetch=_fetch_video,
        accepted_content_types=("application/json",),
        fetcher_name="yt-dlp",
        extract_metadata=_extract_video_metadata,
        extract_provider_data=_extract_video_provider_data,
    ),
)
