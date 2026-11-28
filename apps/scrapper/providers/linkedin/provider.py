from providers.base import ProviderDefinition

from .targets.company import TARGET as COMPANY
from .targets.profile import TARGET as PROFILE

PROVIDER = ProviderDefinition(provider="linkedin", targets=(PROFILE, COMPANY))
