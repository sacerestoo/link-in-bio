from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.post import TARGET as POST
from .targets.publication import TARGET as PUBLICATION

PROVIDER = ProviderDefinition(
    provider="ghost",
    hosts=("*.ghost.io",),
    targets=(
        PUBLICATION,
        POST,
    ),
    default_target=WEBPAGE,
    host_param="publication",
)
