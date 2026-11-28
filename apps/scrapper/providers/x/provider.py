from providers.base import ProviderDefinition

from .targets.profile import TARGET as PROFILE
from .targets.tweet import TARGET as TWEET

PROVIDER = ProviderDefinition(provider="x", targets=(TWEET, PROFILE))
