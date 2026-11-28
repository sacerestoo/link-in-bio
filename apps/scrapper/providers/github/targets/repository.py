from contracts.source import MetadataSource
from routing.path_target import PathRule, PathTarget

from ..api import (
    extract_repository_metadata,
    extract_repository_provider_data,
    fetch_repository,
)

TARGET = PathTarget(
    target_type="repository",
    rules=(
        PathRule(
            path_pattern=(
                "/(?P<owner>[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)"
                "/(?P<repository>[^/]+)/?"
            ),
        ),
    ),
    source=MetadataSource(
        fetch=fetch_repository,
        accepted_content_types=("application/json",),
        extract_metadata=extract_repository_metadata,
        extract_provider_data=extract_repository_provider_data,
    ),
)
