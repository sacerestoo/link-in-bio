from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.maker import TARGET as MAKER
from .targets.product import TARGET as PRODUCT

PROVIDER = ProviderDefinition(
    provider="product_hunt",
    hosts=("producthunt.com", "www.producthunt.com"),
    targets=(PRODUCT, MAKER),
    default_target=WEBPAGE,
)
