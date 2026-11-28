from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.creator import TARGET as CREATOR

PROVIDER = ProviderDefinition(
    provider="buy_me_a_coffee",
    hosts=("buymeacoffee.com", "www.buymeacoffee.com"),
    targets=(CREATOR,),
    default_target=WEBPAGE,
)
