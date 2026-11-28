from urllib.parse import parse_qs, urlsplit

from providers.base import ProviderDefinition, ProviderHostMatch
from providers.registry import GENERIC_PROVIDER, PROVIDERS

from .types import RouteMatch, TargetContext
from .url_safety import normalize_url


def resolve_target(value: object) -> RouteMatch:
    normalized_url = normalize_url(value)
    parts = urlsplit(normalized_url)
    context = TargetContext(
        normalized_url=normalized_url,
        host=(parts.hostname or "").casefold(),
        path=parts.path or "/",
        query={
            key: tuple(values)
            for key, values in parse_qs(
                parts.query,
                keep_blank_values=True,
            ).items()
        },
    )

    candidates: list[tuple[int, int, ProviderDefinition, ProviderHostMatch]] = []
    for index, provider in enumerate(PROVIDERS):
        host_match = provider.match_host(context.host)
        if host_match is not None:
            candidates.append((host_match.specificity, -index, provider, host_match))

    candidates.sort(key=lambda item: (item[0], item[1]), reverse=True)
    for _, _, provider, host_match in candidates:
        match = provider.resolve_target(context, host_match)
        if match is not None:
            return match

    generic_host_match = GENERIC_PROVIDER.match_host(context.host)
    assert generic_host_match is not None
    generic_match = GENERIC_PROVIDER.resolve_target(context, generic_host_match)
    assert generic_match is not None
    return generic_match
