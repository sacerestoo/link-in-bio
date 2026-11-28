from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.profile import TARGET as PROFILE
from .targets.project import TARGET as PROJECT

PROVIDER = ProviderDefinition(
    provider="behance",
    hosts=("behance.net", "www.behance.net"),
    targets=(
        PROJECT,
        PROFILE,
    ),
    default_target=WEBPAGE,
)
