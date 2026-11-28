from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.channel import TARGET as CHANNEL
from .targets.video import TARGET as VIDEO

PROVIDER = ProviderDefinition(
    provider="youtube",
    hosts=("youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"),
    targets=(
        CHANNEL,
        VIDEO,
    ),
    default_target=WEBPAGE,
)
