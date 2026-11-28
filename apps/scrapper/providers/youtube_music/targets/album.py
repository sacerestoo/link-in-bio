from contracts.source import MetadataSource
from routing.path_target import PathRule, PathTarget

from ..api import fetch_youtube_music_page
from ..metadata import extract_album_data, extract_youtube_music_metadata

TARGET = PathTarget(
    target_type="album",
    rules=(
        PathRule(path_pattern="/browse/(?P<album_id>MPRE[^/]+)/?"),
        PathRule(
            path_pattern="/playlist/?",
            query_parameter="list",
            query_param_name="album_id",
            query_parameter_pattern=r"OLAK5uy_[A-Za-z0-9_-]+",
        ),
    ),
    source=MetadataSource(
        fetch=fetch_youtube_music_page,
        accepted_content_types=("text/html", "application/xhtml+xml"),
        extract_metadata=extract_youtube_music_metadata,
        extract_provider_data=extract_album_data,
    ),
)
