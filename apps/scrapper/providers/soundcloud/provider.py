from providers.base import ProviderDefinition

from .targets.playlist import TARGET as PLAYLIST
from .targets.track import TARGET as TRACK
from .targets.user import TARGET as USER

PROVIDER = ProviderDefinition(provider="soundcloud", targets=(PLAYLIST, TRACK, USER))
