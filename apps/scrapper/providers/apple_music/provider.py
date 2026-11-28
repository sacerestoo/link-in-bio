from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.album import TARGET as ALBUM
from .targets.artist import TARGET as ARTIST
from .targets.playlist import TARGET as PLAYLIST
from .targets.song import TARGET as SONG

PROVIDER = ProviderDefinition(
    provider="apple_music",
    hosts=("music.apple.com",),
    targets=(
        ARTIST,
        ALBUM,
        SONG,
        PLAYLIST,
    ),
    default_target=WEBPAGE,
)
