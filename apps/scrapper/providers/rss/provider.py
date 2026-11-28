from providers.base import ProviderDefinition

from .targets.feed import TARGET as FEED

PROVIDER = ProviderDefinition(
    provider="rss",
    hosts=("*",),
    targets=(FEED,),
    default_target=None,
)
