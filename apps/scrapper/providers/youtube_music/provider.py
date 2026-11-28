from providers.base import ProviderDefinition

from .targets.album import TARGET as ALBUM
from .targets.artist import TARGET as ARTIST
from .targets.channel import TARGET as CHANNEL
from .targets.playlist import TARGET as PLAYLIST
from .targets.video import TARGET as VIDEO

PROVIDER = ProviderDefinition(
    provider="youtube_music", targets=(ALBUM, ARTIST, PLAYLIST, CHANNEL, VIDEO)
)
