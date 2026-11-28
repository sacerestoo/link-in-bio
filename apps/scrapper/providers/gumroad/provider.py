from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.creator import TARGET as CREATOR
from .targets.product import TARGET as PRODUCT

PROVIDER = ProviderDefinition(
    provider="gumroad",
    hosts=("gumroad.com", "www.gumroad.com", "*.gumroad.com"),
    targets=(
        PRODUCT,
        CREATOR,
    ),
    default_target=WEBPAGE,
    host_param="creator",
)
