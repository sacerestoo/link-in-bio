from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.app import TARGET as APP

PROVIDER = ProviderDefinition(
    provider="google_play",
    hosts=("play.google.com",),
    targets=(APP,),
    default_target=WEBPAGE,
)
