from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.post import TARGET as POST
from .targets.subreddit import TARGET as SUBREDDIT
from .targets.user import TARGET as USER

PROVIDER = ProviderDefinition(
    provider="reddit",
    hosts=("reddit.com", "www.reddit.com", "old.reddit.com"),
    targets=(
        POST,
        SUBREDDIT,
        USER,
    ),
    default_target=WEBPAGE,
)
