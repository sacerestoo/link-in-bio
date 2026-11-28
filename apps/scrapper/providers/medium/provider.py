from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.article import TARGET as ARTICLE
from .targets.author import TARGET as AUTHOR
from .targets.publication import TARGET as PUBLICATION

PROVIDER = ProviderDefinition(
    provider="medium",
    hosts=("medium.com", "www.medium.com"),
    targets=(
        AUTHOR,
        ARTICLE,
        PUBLICATION,
    ),
    default_target=WEBPAGE,
)
