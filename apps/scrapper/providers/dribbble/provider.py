from providers.base import ProviderDefinition

from .targets.profile import TARGET as PROFILE
from .targets.shot import TARGET as SHOT

PROVIDER = ProviderDefinition(provider="dribbble", targets=(SHOT, PROFILE))
