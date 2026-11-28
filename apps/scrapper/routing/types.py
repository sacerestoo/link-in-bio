from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from contracts.source import MetadataSource


@dataclass(frozen=True, slots=True)
class TargetContext:
    normalized_url: str
    host: str
    path: str
    query: dict[str, tuple[str, ...]]


@dataclass(frozen=True, slots=True)
class RouteMatch:
    normalized_url: str
    provider: str
    target_type: str
    params: dict[str, str]
    target: Target


class Target(Protocol):
    target_type: str
    source: MetadataSource | None

    def match(
        self,
        context: TargetContext,
        host_params: dict[str, str],
    ) -> dict[str, str] | None: ...
