from providers.base import ProviderDefinition

from .targets.feed import TARGET as FEED

PROVIDER = ProviderDefinition(provider="rss", targets=(FEED,))
