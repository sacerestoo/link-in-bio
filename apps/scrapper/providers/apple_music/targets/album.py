from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="album",
    rules=(
        PathRule(
            path_pattern="/(?P<country>[a-z]{2}(?:-[a-z]{2})?)/album/(?P<name>[^/]+)/(?P<album_id>[^/]+)/?"
        ),
    ),
)
