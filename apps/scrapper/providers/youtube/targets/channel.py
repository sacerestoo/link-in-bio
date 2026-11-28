from contracts.source import MetadataSource
from routing.path_target import PathRule, PathTarget

from ..api import (
    _api_channel,
    _extract_channel_metadata,
    _extract_channel_provider_data,
)

TARGET = PathTarget(
    target_type="channel",
    rules=(
        PathRule(
            path_pattern="/@(?P<handle>[^/]+)/?",
            host_patterns=("youtube.com", "www.youtube.com", "m.youtube.com"),
        ),
        PathRule(
            path_pattern="/channel/(?P<channel_id>[^/]+)/?",
            host_patterns=("youtube.com", "www.youtube.com", "m.youtube.com"),
        ),
        PathRule(
            path_pattern="/user/(?P<username>[^/]+)/?",
            host_patterns=("youtube.com", "www.youtube.com", "m.youtube.com"),
        ),
    ),
    source=MetadataSource(
        fetch=_api_channel,
        accepted_content_types=("application/json",),
        extract_metadata=_extract_channel_metadata,
        extract_provider_data=_extract_channel_provider_data,
    ),
)
