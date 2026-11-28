from providers.base import ProviderDefinition

from .targets.profile import TARGET as PROFILE
from .targets.project import TARGET as PROJECT

PROVIDER = ProviderDefinition(provider="behance", targets=(PROJECT, PROFILE))
