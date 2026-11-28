from providers.base import ProviderDefinition

from .targets.profile import TARGET as PROFILE
from .targets.repository import TARGET as REPOSITORY

PROVIDER = ProviderDefinition(provider="github", targets=(REPOSITORY, PROFILE))
