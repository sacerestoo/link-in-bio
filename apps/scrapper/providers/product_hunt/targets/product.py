from contracts.source import MetadataSource
from providers.base import ProviderTarget

from ..api import _extract_metadata, extract_product_provider_data, fetch_product

TARGET = ProviderTarget(
    target_type="product",
    source=MetadataSource(
        fetch=fetch_product,
        accepted_content_types=("application/json",),
        extract_metadata=_extract_metadata,
        extract_provider_data=extract_product_provider_data,
    ),
)
