from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="show",
    rules=(PathRule(path_pattern="/show/(?P<id>[^/]+)/?"),),
)
