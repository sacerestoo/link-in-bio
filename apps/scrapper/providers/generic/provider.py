from providers.base import ProviderDefinition

from .targets.webpage import TARGET as WEBPAGE

PROVIDER = ProviderDefinition(provider="generic", targets=(WEBPAGE,))
