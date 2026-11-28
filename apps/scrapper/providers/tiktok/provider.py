from providers.base import ProviderDefinition

from .targets.profile import TARGET as PROFILE
from .targets.video import TARGET as VIDEO

PROVIDER = ProviderDefinition(provider="tiktok", targets=(VIDEO, PROFILE))
