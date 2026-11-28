from providers.base import ProviderDefinition

from .targets.post import TARGET as POST
from .targets.subreddit import TARGET as SUBREDDIT
from .targets.user import TARGET as USER

PROVIDER = ProviderDefinition(provider="reddit", targets=(POST, SUBREDDIT, USER))
