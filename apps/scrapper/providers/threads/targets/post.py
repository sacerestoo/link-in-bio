from contracts.source import MetadataSource
from routing.path_target import PathRule, PathTarget

from ..api import _post_provider_data

TARGET = PathTarget(
    target_type="post",
    rules=(
        PathRule(
            path_pattern=r"/@(?P<handle>[A-Za-z0-9._]{1,30})/post/(?P<post_id>[A-Za-z0-9_-]{1,64})/?"
        ),
    ),
    source=MetadataSource(extract_provider_data=_post_provider_data),
)
