from contracts.source import MetadataSource
from routing.path_target import PathRule, PathTarget

from ..api import (
    _extract_metadata,
    extract_product_provider_data,
    fetch_product,
)

TARGET = PathTarget(
    target_type="product",
    rules=(
        PathRule(
            path_pattern=(
                "/(?:products|posts)/(?P<slug>[^/]+)"
                "(?:/(?:launches|reviews|prelaunch))?/?"
            ),
        ),
    ),
    source=MetadataSource(
        fetch=fetch_product,
        accepted_content_types=("application/json",),
        extract_metadata=_extract_metadata,
        extract_provider_data=extract_product_provider_data,
    ),
)
