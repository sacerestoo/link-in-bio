from providers.base import ProviderDefinition

from .targets.creator import TARGET as CREATOR

PROVIDER = ProviderDefinition(provider="ko_fi", targets=(CREATOR,))
