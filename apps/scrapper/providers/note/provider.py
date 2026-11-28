from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.creator import TARGET as CREATOR
from .targets.post import TARGET as POST

PROVIDER = ProviderDefinition(
    provider="note",
    hosts=("note.com", "www.note.com"),
    targets=(
        POST,
        CREATOR,
    ),
    default_target=WEBPAGE,
)
