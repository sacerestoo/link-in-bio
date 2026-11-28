from contracts.source import MetadataSource
from routing.path_target import PathRule, PathTarget

from ..api import (
    _extract_metadata,
    extract_maker_provider_data,
    fetch_maker,
)

TARGET = PathTarget(
    target_type="maker",
    rules=(PathRule(path_pattern="/@(?P<username>[^/]+)/?"),),
    source=MetadataSource(
        fetch=fetch_maker,
        accepted_content_types=("application/json",),
        extract_metadata=_extract_metadata,
        extract_provider_data=extract_maker_provider_data,
    ),
)
