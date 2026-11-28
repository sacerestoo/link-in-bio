from contracts.source import MetadataSource
from routing.path_target import PathRule, PathTarget

from ..api import fetch_youtube_music_page
from ..metadata import extract_playlist_data, extract_youtube_music_metadata

TARGET = PathTarget(
    target_type="playlist",
    rules=(
        PathRule(
            path_pattern="/playlist/?",
            query_parameter="list",
            query_parameter_pattern=r"(?!OLAK5uy_)[A-Za-z0-9_-]+",
        ),
    ),
    source=MetadataSource(
        fetch=fetch_youtube_music_page,
        accepted_content_types=("text/html", "application/xhtml+xml"),
        extract_metadata=extract_youtube_music_metadata,
        extract_provider_data=extract_playlist_data,
    ),
)
