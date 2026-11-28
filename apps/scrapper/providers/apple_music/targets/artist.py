from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="artist",
    rules=(
        PathRule(
            path_pattern="/(?P<country>[a-z]{2}(?:-[a-z]{2})?)/artist/(?P<name>[^/]+)/(?P<artist_id>[^/]+)/?"
        ),
    ),
)
