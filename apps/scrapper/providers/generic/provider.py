from providers.base import ProviderDefinition

from .targets.webpage import TARGET as WEBPAGE

PROVIDER = ProviderDefinition(
    provider="generic",
    hosts=("*",),
    targets=(WEBPAGE,),
    default_target=None,
)
