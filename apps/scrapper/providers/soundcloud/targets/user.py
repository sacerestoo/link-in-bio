from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="user",
    rules=(PathRule(path_pattern="/(?P<username>[^/]+)/?"),),
)
