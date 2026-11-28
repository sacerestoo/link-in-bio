from contracts.source import MetadataSource
from routing.path_target import PathRule, PathTarget

from ..api import (
    _api_profile,
    _extract_profile_metadata,
    _extract_profile_provider_data,
)

TARGET = PathTarget(
    target_type="profile",
    rules=(PathRule(path_pattern="/(?P<login>[^/]+)/?"),),
    source=MetadataSource(
        fetch=_api_profile,
        accepted_content_types=("application/json",),
        extract_metadata=_extract_profile_metadata,
        extract_provider_data=_extract_profile_provider_data,
    ),
)
