from providers.base import ProviderDefinition

from .targets.channel import TARGET as CHANNEL

PROVIDER = ProviderDefinition(provider="chzzk", targets=(CHANNEL,))
