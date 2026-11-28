from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.profile import TARGET as PROFILE
from .targets.video import TARGET as VIDEO

PROVIDER = ProviderDefinition(
    provider="tiktok",
    hosts=("tiktok.com", "www.tiktok.com", "m.tiktok.com"),
    targets=(
        VIDEO,
        PROFILE,
    ),
    default_target=WEBPAGE,
)
