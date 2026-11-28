from providers.base import ProviderDefinition

from .targets.channel import TARGET as CHANNEL
from .targets.video import TARGET as VIDEO

PROVIDER = ProviderDefinition(provider="youtube", targets=(CHANNEL, VIDEO))
