from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.album import TARGET as ALBUM
from .targets.artist import TARGET as ARTIST
from .targets.channel import TARGET as CHANNEL
from .targets.playlist import TARGET as PLAYLIST
from .targets.video import TARGET as VIDEO

PROVIDER = ProviderDefinition(
    provider="youtube_music",
    hosts=("music.youtube.com",),
    targets=(
        ALBUM,
        ARTIST,
        PLAYLIST,
        CHANNEL,
        VIDEO,
    ),
    default_target=WEBPAGE,
)
