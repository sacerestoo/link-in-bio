from dataclasses import dataclass

from contracts.source import MetadataSource


@dataclass(frozen=True, slots=True)
class ProviderTarget:
    target_type: str
    source: MetadataSource | None = None


@dataclass(frozen=True, slots=True)
class ProviderDefinition:
    provider: str
    targets: tuple[ProviderTarget, ...]
