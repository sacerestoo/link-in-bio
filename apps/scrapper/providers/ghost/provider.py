from providers.base import ProviderDefinition

from .targets.post import TARGET as POST
from .targets.publication import TARGET as PUBLICATION

PROVIDER = ProviderDefinition(provider="ghost", targets=(PUBLICATION, POST))
