from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="short_link",
    rules=(
        PathRule(path_pattern="/(?P<short_code>[^/]+)/?", host_patterns=("pin.it",)),
    ),
)
