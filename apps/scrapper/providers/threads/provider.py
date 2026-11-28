from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.post import TARGET as POST
from .targets.profile import TARGET as PROFILE

PROVIDER = ProviderDefinition(
    provider="threads",
    hosts=("threads.net", "www.threads.net", "threads.com", "www.threads.com"),
    targets=(
        POST,
        PROFILE,
    ),
    default_target=WEBPAGE,
)
