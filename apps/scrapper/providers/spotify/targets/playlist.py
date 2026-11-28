from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="playlist",
    rules=(PathRule(path_pattern="/playlist/(?P<id>[^/]+)/?"),),
)
