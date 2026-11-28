from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="artist",
    rules=(PathRule(path_pattern="/artist/(?P<id>[^/]+)/?"),),
)
