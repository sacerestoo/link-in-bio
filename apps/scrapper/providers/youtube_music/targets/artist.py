from contracts.source import MetadataSource
from routing.path_target import PathRule, PathTarget

from ..api import fetch_youtube_music_page
from ..metadata import extract_artist_data, extract_youtube_music_metadata

TARGET = PathTarget(
    target_type="artist",
    rules=(
        PathRule(path_pattern="/channel/(?P<artist_id>UC[^/]+)/?"),
        PathRule(path_pattern="/browse/(?P<artist_id>UC[^/]+)/?"),
    ),
    source=MetadataSource(
        fetch=fetch_youtube_music_page,
        accepted_content_types=("text/html", "application/xhtml+xml"),
        extract_metadata=extract_youtube_music_metadata,
        extract_provider_data=extract_artist_data,
    ),
)
