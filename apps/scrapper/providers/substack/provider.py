from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.post import TARGET as POST
from .targets.publication import TARGET as PUBLICATION
from .targets.subscribe import TARGET as SUBSCRIBE

PROVIDER = ProviderDefinition(
    provider="substack",
    hosts=("*.substack.com",),
    targets=(
        POST,
        SUBSCRIBE,
        PUBLICATION,
    ),
    default_target=WEBPAGE,
    host_param="publication",
)
