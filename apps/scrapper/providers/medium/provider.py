from providers.base import ProviderDefinition

from .targets.article import TARGET as ARTICLE
from .targets.author import TARGET as AUTHOR
from .targets.publication import TARGET as PUBLICATION

PROVIDER = ProviderDefinition(provider="medium", targets=(AUTHOR, ARTICLE, PUBLICATION))
