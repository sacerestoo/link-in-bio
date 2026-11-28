from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="profile",
    rules=(
        PathRule(
            path_pattern="/(?P<username>[^/]+)/_created/?",
            static_params=(("view", "created"),),
        ),
        PathRule(
            path_pattern="/(?P<username>[^/]+)/_saved/?",
            static_params=(("view", "saved"),),
        ),
        PathRule(
            path_pattern="/(?P<username>[^/]+)/pins/?",
            static_params=(("view", "pins"),),
        ),
        PathRule(
            path_pattern="/(?P<username>[^/]+)/?",
            host_patterns=("pinterest.com", "www.pinterest.com"),
        ),
    ),
)
