import re
from dataclasses import dataclass
from urllib.parse import unquote

from contracts.source import MetadataSource

from .hosts import match_host_pattern
from .types import TargetContext


@dataclass(frozen=True, slots=True)
class PathRule:
    path_pattern: str
    query_parameter: str | None = None
    query_param_name: str | None = None
    query_parameter_pattern: str | None = None
    requires_host_param: bool | None = None
    host_patterns: tuple[str, ...] = ()
    static_params: tuple[tuple[str, str], ...] = ()


@dataclass(frozen=True, slots=True)
class PathTarget:
    target_type: str
    rules: tuple[PathRule, ...] = ()
    match_any: bool = False
    source: MetadataSource | None = None

    def match(
        self,
        context: TargetContext,
        host_params: dict[str, str],
    ) -> dict[str, str] | None:
        if self.match_any:
            return {}

        for rule in self.rules:
            if rule.requires_host_param is True and not host_params:
                continue
            if rule.requires_host_param is False and host_params:
                continue
            if rule.host_patterns and not any(
                match_host_pattern(context.host, pattern) is not None
                for pattern in rule.host_patterns
            ):
                continue

            match = re.fullmatch(rule.path_pattern, context.path)
            if match is None:
                continue

            params = {
                key: unquote(value)
                for key, value in match.groupdict().items()
                if value is not None
            }
            params.update(rule.static_params)

            if rule.query_parameter:
                values = context.query.get(rule.query_parameter, ())
                if not values or not values[0]:
                    continue
                if (
                    rule.query_parameter_pattern
                    and re.fullmatch(rule.query_parameter_pattern, values[0]) is None
                ):
                    continue
                param_name = rule.query_param_name or rule.query_parameter
                params[param_name] = values[0]

            return params

        return None
