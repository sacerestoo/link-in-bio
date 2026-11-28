from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.profile import TARGET as PROFILE
from .targets.shot import TARGET as SHOT

PROVIDER = ProviderDefinition(
    provider="dribbble",
    hosts=("dribbble.com", "www.dribbble.com"),
    targets=(
        SHOT,
        PROFILE,
    ),
    default_target=WEBPAGE,
)
