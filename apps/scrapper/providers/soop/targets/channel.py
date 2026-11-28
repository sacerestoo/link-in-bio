from contracts.source import MetadataSource
from routing.path_target import PathRule, PathTarget

from ..api import extract_metadata, extract_provider_data, fetch_channel

TARGET = PathTarget(
    target_type="channel",
    rules=(PathRule(path_pattern="/station/(?P<user_id>[^/]+)/?"),),
    source=MetadataSource(
        fetch=fetch_channel,
        accepted_content_types=("application/json",),
        extract_metadata=extract_metadata,
        extract_provider_data=extract_provider_data,
    ),
)
