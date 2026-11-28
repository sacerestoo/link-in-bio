from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.community_file import TARGET as COMMUNITY_FILE
from .targets.design import TARGET as DESIGN
from .targets.file import TARGET as FILE
from .targets.profile import TARGET as PROFILE
from .targets.proto import TARGET as PROTO
from .targets.team import TARGET as TEAM

PROVIDER = ProviderDefinition(
    provider="figma",
    hosts=("figma.com", "www.figma.com"),
    targets=(
        COMMUNITY_FILE,
        DESIGN,
        FILE,
        PROTO,
        PROFILE,
        TEAM,
    ),
    default_target=WEBPAGE,
)
