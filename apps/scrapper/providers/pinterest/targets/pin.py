from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="pin",
    rules=(
        PathRule(
            path_pattern="/pin/(?P<pin_id>[^/]+)/?",
            host_patterns=("pinterest.com", "www.pinterest.com"),
        ),
    ),
)
