from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class HostPatternMatch:
    specificity: int
    subdomain: str | None = None


def match_host_pattern(host: str, pattern: str) -> HostPatternMatch | None:
    if pattern == "*":
        return HostPatternMatch(specificity=0)

    if pattern.startswith("*."):
        suffix = pattern[1:]
        if not host.endswith(suffix):
            return None
        subdomain = host[: -len(suffix)]
        if not subdomain:
            return None
        return HostPatternMatch(specificity=len(suffix), subdomain=subdomain)

    if host == pattern:
        return HostPatternMatch(specificity=len(pattern))
    return None
