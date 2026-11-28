from contracts.source import MetadataSource
from routing.path_target import PathRule, PathTarget

from ..api import extract_post_provider_data

TARGET = PathTarget(
    target_type="post",
    rules=(
        PathRule(path_pattern=r"/p/(?P<shortcode>[A-Za-z0-9_-]+)/?"),
        PathRule(
            path_pattern=r"/[A-Za-z0-9._]{1,30}/p/(?P<shortcode>[A-Za-z0-9_-]+)/?"
        ),
    ),
    source=MetadataSource(extract_provider_data=extract_post_provider_data),
)
