from contracts.source import MetadataSource
from routing.path_target import PathRule, PathTarget

from ..api import extract_metadata, extract_provider_data, fetch_invite

TARGET = PathTarget(
    target_type="invite",
    rules=(
        PathRule(path_pattern="/invite/(?P<invite_code>[^/]+)/?"),
        PathRule(
            path_pattern="/(?P<invite_code>[^/]+)/?",
            host_patterns=("discord.gg", "www.discord.gg"),
        ),
    ),
    source=MetadataSource(
        fetch=fetch_invite,
        accepted_content_types=("application/json",),
        extract_metadata=extract_metadata,
        extract_provider_data=extract_provider_data,
    ),
)
