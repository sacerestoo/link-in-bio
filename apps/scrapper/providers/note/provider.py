from providers.base import ProviderDefinition

from .targets.creator import TARGET as CREATOR
from .targets.post import TARGET as POST

PROVIDER = ProviderDefinition(provider="note", targets=(POST, CREATOR))
