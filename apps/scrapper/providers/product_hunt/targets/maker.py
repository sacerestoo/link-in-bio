from contracts.source import MetadataSource
from providers.base import ProviderTarget

from ..api import _extract_metadata, extract_maker_provider_data, fetch_maker

TARGET = ProviderTarget(
    target_type="maker",
    source=MetadataSource(
        fetch=fetch_maker,
        accepted_content_types=("application/json",),
        extract_metadata=_extract_metadata,
        extract_provider_data=extract_maker_provider_data,
    ),
)
