from contracts.source import MetadataSource
from providers.base import ProviderTarget

from ..api import _extract_post_metadata, _extract_post_provider_data, _fetch_post

TARGET = ProviderTarget(
    target_type="post",
    source=MetadataSource(
        fetch=_fetch_post,
        headers={"Accept-Language": "en-US,en;q=0.9"},
        extract_metadata=_extract_post_metadata,
        extract_provider_data=_extract_post_provider_data,
    ),
)
