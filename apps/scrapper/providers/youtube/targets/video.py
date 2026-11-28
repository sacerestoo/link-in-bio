from contracts.source import MetadataSource
from routing.path_target import PathRule, PathTarget

from ..api import _api_video, _extract_video_metadata, _extract_video_provider_data

TARGET = PathTarget(
    target_type="video",
    rules=(
        PathRule(
            path_pattern="/watch/?",
            query_parameter="v",
            query_param_name="video_id",
            host_patterns=("youtube.com", "www.youtube.com", "m.youtube.com"),
        ),
        PathRule(
            path_pattern="/(?:shorts|embed|live)/(?P<video_id>[^/]+)/?",
            host_patterns=("youtube.com", "www.youtube.com", "m.youtube.com"),
        ),
        PathRule(path_pattern="/(?P<video_id>[^/]+)/?", host_patterns=("youtu.be",)),
    ),
    source=MetadataSource(
        fetch=_api_video,
        accepted_content_types=("application/json",),
        extract_metadata=_extract_video_metadata,
        extract_provider_data=_extract_video_provider_data,
    ),
)
