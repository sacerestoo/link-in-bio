from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.profile import TARGET as PROFILE
from .targets.video import TARGET as VIDEO

PROVIDER = ProviderDefinition(
    provider="twitch",
    hosts=("twitch.tv", "www.twitch.tv"),
    targets=(
        VIDEO,
        PROFILE,
    ),
    default_target=WEBPAGE,
)
