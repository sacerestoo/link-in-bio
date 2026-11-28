from providers.base import ProviderDefinition

from .targets.post import TARGET as POST
from .targets.profile import TARGET as PROFILE

PROVIDER = ProviderDefinition(provider="facebook", targets=(POST, PROFILE))
