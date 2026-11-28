from providers.base import ProviderDefinition

from .targets.playlist import TARGET as PLAYLIST
from .targets.short_link import TARGET as SHORT_LINK
from .targets.track import TARGET as TRACK
from .targets.user import TARGET as USER

PROVIDER = ProviderDefinition(
    provider="soundcloud", targets=(SHORT_LINK, PLAYLIST, TRACK, USER)
)
