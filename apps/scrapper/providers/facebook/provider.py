from providers.base import ProviderDefinition

from .targets.page_or_profile import TARGET as PAGE_OR_PROFILE

PROVIDER = ProviderDefinition(
    provider="facebook",
    hosts=("facebook.com", "www.facebook.com"),
    targets=(PAGE_OR_PROFILE,),
    default_target=None,
)
