from providers.base import ProviderDefinition

from .targets.maker import TARGET as MAKER
from .targets.product import TARGET as PRODUCT

PROVIDER = ProviderDefinition(provider="product_hunt", targets=(PRODUCT, MAKER))
