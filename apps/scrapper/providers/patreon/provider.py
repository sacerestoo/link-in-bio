from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.creator import TARGET as CREATOR
from .targets.post import TARGET as POST

PROVIDER = ProviderDefinition(
    provider="patreon",
    hosts=("patreon.com", "www.patreon.com"),
    targets=(
        POST,
        CREATOR,
    ),
    default_target=WEBPAGE,
)
