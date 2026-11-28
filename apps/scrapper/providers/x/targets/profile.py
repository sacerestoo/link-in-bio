from contracts.source import MetadataSource
from routing.path_target import PathRule, PathTarget

from ..api import _extract_profile_provider_data

TARGET = PathTarget(
    target_type="profile",
    rules=(PathRule(path_pattern="/(?P<handle>[A-Za-z0-9_]+)/?"),),
    source=MetadataSource(extract_provider_data=_extract_profile_provider_data),
)
