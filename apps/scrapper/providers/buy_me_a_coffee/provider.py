from providers.base import ProviderDefinition

from .targets.creator import TARGET as CREATOR

PROVIDER = ProviderDefinition(provider="buy_me_a_coffee", targets=(CREATOR,))
