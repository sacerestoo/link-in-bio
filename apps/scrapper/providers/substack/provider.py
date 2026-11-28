from providers.base import ProviderDefinition

from .targets.feed import TARGET as FEED
from .targets.post import TARGET as POST
from .targets.profile import TARGET as PROFILE
from .targets.publication import TARGET as PUBLICATION
from .targets.subscribe import TARGET as SUBSCRIBE

PROVIDER = ProviderDefinition(
    provider="substack", targets=(POST, FEED, PROFILE, SUBSCRIBE, PUBLICATION)
)
