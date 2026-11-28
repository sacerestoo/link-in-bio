from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.creator import TARGET as CREATOR

PROVIDER = ProviderDefinition(
    provider="ko_fi",
    hosts=("ko-fi.com", "www.ko-fi.com"),
    targets=(CREATOR,),
    default_target=WEBPAGE,
)
