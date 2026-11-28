from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.profile import TARGET as PROFILE
from .targets.tweet import TARGET as TWEET

PROVIDER = ProviderDefinition(
    provider="x",
    hosts=("x.com", "www.x.com", "twitter.com", "www.twitter.com"),
    targets=(
        TWEET,
        PROFILE,
    ),
    default_target=WEBPAGE,
)
