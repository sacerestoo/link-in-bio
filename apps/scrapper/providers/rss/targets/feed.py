from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="feed",
    rules=(
        PathRule(path_pattern="/feed/?"),
        PathRule(path_pattern="/rss/?"),
        PathRule(path_pattern="/.+\\.xml/?"),
    ),
)
