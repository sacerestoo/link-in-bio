from contracts.source import MetadataSource
from providers.base import ProviderTarget

from ..api import fetch_youtube_music_page
from ..metadata import extract_album_data, extract_youtube_music_metadata

TARGET = ProviderTarget(
    target_type="album",
    source=MetadataSource(
        fetch=fetch_youtube_music_page,
        accepted_content_types=("text/html", "application/xhtml+xml"),
        extract_metadata=extract_youtube_music_metadata,
        extract_provider_data=extract_album_data,
    ),
)
