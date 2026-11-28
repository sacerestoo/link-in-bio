from providers.base import ProviderDefinition

from .targets.app import TARGET as APP

PROVIDER = ProviderDefinition(provider="google_play", targets=(APP,))
