from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.company import TARGET as COMPANY
from .targets.profile import TARGET as PROFILE

PROVIDER = ProviderDefinition(
    provider="linkedin",
    hosts=("linkedin.com", "www.linkedin.com"),
    targets=(
        PROFILE,
        COMPANY,
    ),
    default_target=WEBPAGE,
)
