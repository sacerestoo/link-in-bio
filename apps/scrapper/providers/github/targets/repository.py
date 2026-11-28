from contracts.source import MetadataSource
from providers.base import ProviderTarget

from ..api import (
    extract_repository_metadata,
    extract_repository_provider_data,
    fetch_repository,
)

TARGET = ProviderTarget(
    target_type="repository",
    source=MetadataSource(
        fetch=fetch_repository,
        accepted_content_types=("application/json",),
        extract_metadata=extract_repository_metadata,
        extract_provider_data=extract_repository_provider_data,
    ),
)
