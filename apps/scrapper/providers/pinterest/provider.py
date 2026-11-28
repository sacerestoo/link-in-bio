from providers.base import ProviderDefinition

from .targets.board import TARGET as BOARD
from .targets.pin import TARGET as PIN
from .targets.profile import TARGET as PROFILE
from .targets.short_link import TARGET as SHORT_LINK

PROVIDER = ProviderDefinition(
    provider="pinterest", targets=(PIN, PROFILE, BOARD, SHORT_LINK)
)
