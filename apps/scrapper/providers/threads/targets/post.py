from contracts.source import MetadataSource
from providers.base import ProviderTarget

from ..api import _post_provider_data

TARGET = ProviderTarget(
    target_type="post", source=MetadataSource(extract_provider_data=_post_provider_data)
)
