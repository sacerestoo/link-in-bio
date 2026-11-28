from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="app",
    rules=(
        PathRule(
            path_pattern="/store/apps/details/?",
            query_parameter="id",
            query_param_name="package_name",
        ),
    ),
)
