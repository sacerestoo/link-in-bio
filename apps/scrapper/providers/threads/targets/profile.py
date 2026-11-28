from contracts.source import MetadataSource
from routing.path_target import PathRule, PathTarget

from ..api import _profile_provider_data

TARGET = PathTarget(
    target_type="profile",
    rules=(PathRule(path_pattern=r"/@(?P<handle>[A-Za-z0-9._]{1,30})/?"),),
    source=MetadataSource(extract_provider_data=_profile_provider_data),
)
