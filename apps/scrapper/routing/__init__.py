from .types import RouteMatch
from .url_safety import URLNormalizationError, normalize_url, validate_public_url


def resolve_target(value: object) -> RouteMatch:
    from .resolver import resolve_target as resolve

    return resolve(value)


__all__ = [
    "RouteMatch",
    "URLNormalizationError",
    "normalize_url",
    "resolve_target",
    "validate_public_url",
]
