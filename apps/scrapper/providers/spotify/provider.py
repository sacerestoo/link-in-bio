from providers.base import ProviderDefinition

from .targets.album import TARGET as ALBUM
from .targets.artist import TARGET as ARTIST
from .targets.episode import TARGET as EPISODE
from .targets.playlist import TARGET as PLAYLIST
from .targets.show import TARGET as SHOW
from .targets.track import TARGET as TRACK

PROVIDER = ProviderDefinition(
    provider="spotify", targets=(ARTIST, ALBUM, TRACK, PLAYLIST, SHOW, EPISODE)
)
