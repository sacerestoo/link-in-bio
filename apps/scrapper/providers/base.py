from dataclasses import dataclass

from routing.hosts import match_host_pattern
from routing.types import RouteMatch, Target, TargetContext


@dataclass(frozen=True, slots=True)
class ProviderHostMatch:
    specificity: int
    params: dict[str, str]


@dataclass(frozen=True, slots=True)
class ProviderDefinition:
    provider: str
    hosts: tuple[str, ...]
    targets: tuple[Target, ...]
    default_target: Target | None
    host_param: str | None = None

    def match_host(self, host: str) -> ProviderHostMatch | None:
        matches = []
        for pattern in self.hosts:
            match = match_host_pattern(host, pattern)
            if match is None:
                continue
            params = (
                {self.host_param: match.subdomain}
                if self.host_param and match.subdomain
                else {}
            )
            matches.append(ProviderHostMatch(match.specificity, params))
        return max(matches, key=lambda match: match.specificity) if matches else None

    def resolve_target(
        self,
        context: TargetContext,
        host_match: ProviderHostMatch,
    ) -> RouteMatch | None:
        for target in self.targets:
            target_params = target.match(context, host_match.params)
            if target_params is not None:
                return self._route_match(target, context, host_match, target_params)

        if self.default_target is None:
            return None

        target_params = self.default_target.match(context, host_match.params)
        if target_params is None:
            return None
        return self._route_match(
            self.default_target,
            context,
            host_match,
            target_params,
        )

    def _route_match(
        self,
        target: Target,
        context: TargetContext,
        host_match: ProviderHostMatch,
        target_params: dict[str, str],
    ) -> RouteMatch:
        return RouteMatch(
            normalized_url=context.normalized_url,
            provider=self.provider,
            target_type=target.target_type,
            params={**host_match.params, **target_params},
            target=target,
        )
