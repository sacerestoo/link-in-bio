from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.playlist import TARGET as PLAYLIST
from .targets.track import TARGET as TRACK
from .targets.user import TARGET as USER

PROVIDER = ProviderDefinition(
    provider="soundcloud",
    hosts=("soundcloud.com", "www.soundcloud.com"),
    targets=(
        PLAYLIST,
        TRACK,
        USER,
    ),
    default_target=WEBPAGE,
)
