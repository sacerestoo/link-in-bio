from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="product",
    rules=(
        PathRule(path_pattern="/l/(?P<product_slug>[^/]+)/?"),
        PathRule(
            path_pattern="/(?P<product_slug>[^/]+)/?",
            requires_host_param=True,
            host_patterns=("*.gumroad.com",),
        ),
    ),
)
