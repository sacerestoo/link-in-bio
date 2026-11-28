from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="episode",
    rules=(PathRule(path_pattern="/episode/(?P<id>[^/]+)/?"),),
)
