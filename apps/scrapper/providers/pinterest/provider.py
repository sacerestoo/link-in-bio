from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.board import TARGET as BOARD
from .targets.pin import TARGET as PIN
from .targets.profile import TARGET as PROFILE
from .targets.short_link import TARGET as SHORT_LINK

PROVIDER = ProviderDefinition(
    provider="pinterest",
    hosts=("pinterest.com", "www.pinterest.com", "pin.it"),
    targets=(
        PIN,
        PROFILE,
        BOARD,
        SHORT_LINK,
    ),
    default_target=WEBPAGE,
)
