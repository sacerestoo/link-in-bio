from providers.base import ProviderDefinition

from .targets.invite import TARGET as INVITE

PROVIDER = ProviderDefinition(provider="discord", targets=(INVITE,))
