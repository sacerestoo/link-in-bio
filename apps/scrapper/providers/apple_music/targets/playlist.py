from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="playlist",
    rules=(
        PathRule(
            path_pattern="/(?P<country>[a-z]{2}(?:-[a-z]{2})?)/playlist/(?P<name>[^/]+)/(?P<playlist_id>[^/]+)/?"
        ),
    ),
)
