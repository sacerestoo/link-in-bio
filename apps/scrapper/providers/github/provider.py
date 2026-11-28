from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.profile import TARGET as PROFILE
from .targets.repository import TARGET as REPOSITORY

PROVIDER = ProviderDefinition(
    provider="github",
    hosts=("github.com", "www.github.com"),
    targets=(REPOSITORY, PROFILE),
    default_target=WEBPAGE,
)
