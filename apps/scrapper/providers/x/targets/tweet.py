from contracts.source import MetadataSource
from routing.path_target import PathRule, PathTarget

from ..api import _extract_metadata, _extract_provider_data, _fetch_tweet

TARGET = PathTarget(
    target_type="tweet",
    rules=(
        PathRule(path_pattern=r"/i/status/(?P<tweet_id>\d+)/?"),
        PathRule(path_pattern=r"/(?P<handle>[A-Za-z0-9_]+)/status/(?P<tweet_id>\d+)/?"),
    ),
    source=MetadataSource(
        fetch=_fetch_tweet,
        accepted_content_types=("application/json",),
        extract_metadata=_extract_metadata,
        extract_provider_data=_extract_provider_data,
    ),
)
