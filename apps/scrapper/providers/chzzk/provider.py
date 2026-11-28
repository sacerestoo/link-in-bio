from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.channel import TARGET as CHANNEL

PROVIDER = ProviderDefinition(
    provider="chzzk",
    hosts=("chzzk.naver.com",),
    targets=(CHANNEL,),
    default_target=WEBPAGE,
)
