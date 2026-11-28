from contracts.source import MetadataSource
from routing.path_target import PathRule, PathTarget

from ..api import (
    extract_profile_metadata,
    extract_profile_provider_data,
    fetch_profile,
)

TARGET = PathTarget(
    target_type="profile",
    rules=(
        PathRule(
            path_pattern="/(?P<username>[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)/?"
        ),
    ),
    source=MetadataSource(
        fetch=fetch_profile,
        accepted_content_types=("application/json",),
        extract_metadata=extract_profile_metadata,
        extract_provider_data=extract_profile_provider_data,
    ),
)
