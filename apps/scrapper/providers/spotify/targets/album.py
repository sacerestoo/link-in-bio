from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="album",
    rules=(PathRule(path_pattern="/album/(?P<id>[^/]+)/?"),),
)
