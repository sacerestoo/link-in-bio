from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="app",
    rules=(
        PathRule(
            path_pattern="/(?P<country>[a-z]{2}(?:-[a-z]{2})?)/app/(?P<slug>[^/]+)/id(?P<app_id>\\d+)/?"
        ),
    ),
)
