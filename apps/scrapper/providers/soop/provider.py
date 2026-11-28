from providers.base import ProviderDefinition

from .targets.channel import TARGET as CHANNEL

PROVIDER = ProviderDefinition(provider="soop", targets=(CHANNEL,))
