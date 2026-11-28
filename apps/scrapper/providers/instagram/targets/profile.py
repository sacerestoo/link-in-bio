from contracts.source import MetadataSource
from routing.path_target import PathRule, PathTarget

from ..api import (
    _extract_profile_metadata,
    _fetch_profile,
    extract_profile_provider_data,
)

TARGET = PathTarget(
    target_type="profile",
    rules=(PathRule(path_pattern=r"/(?P<handle>[A-Za-z0-9._]{1,30})/?"),),
    source=MetadataSource(
        fetch=_fetch_profile,
        extract_metadata=_extract_profile_metadata,
        extract_provider_data=extract_profile_provider_data,
    ),
)
