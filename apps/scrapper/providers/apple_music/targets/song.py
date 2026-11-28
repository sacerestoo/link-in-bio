from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="song",
    rules=(
        PathRule(
            path_pattern="/(?P<country>[a-z]{2}(?:-[a-z]{2})?)/song/(?P<name>[^/]+)/(?P<song_id>[^/]+)/?"
        ),
    ),
)
