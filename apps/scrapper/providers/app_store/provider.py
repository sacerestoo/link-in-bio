from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.app import TARGET as APP

PROVIDER = ProviderDefinition(
    provider="app_store",
    hosts=("apps.apple.com",),
    targets=(APP,),
    default_target=WEBPAGE,
)
