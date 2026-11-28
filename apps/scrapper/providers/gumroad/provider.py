from providers.base import ProviderDefinition

from .targets.creator import TARGET as CREATOR
from .targets.product import TARGET as PRODUCT

PROVIDER = ProviderDefinition(provider="gumroad", targets=(PRODUCT, CREATOR))
