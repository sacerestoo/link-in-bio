from providers.base import ProviderDefinition
from providers.generic.targets.webpage import TARGET as WEBPAGE

from .targets.invite import TARGET as INVITE

PROVIDER = ProviderDefinition(
    provider="discord",
    hosts=("discord.gg", "www.discord.gg", "discord.com", "www.discord.com"),
    targets=(INVITE,),
    default_target=WEBPAGE,
)
