from providers.base import ProviderDefinition

from .targets.post import TARGET as POST
from .targets.publication import TARGET as PUBLICATION
from .targets.subscribe import TARGET as SUBSCRIBE

PROVIDER = ProviderDefinition(
    provider="substack", targets=(POST, SUBSCRIBE, PUBLICATION)
)
