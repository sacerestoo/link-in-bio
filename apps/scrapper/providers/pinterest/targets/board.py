from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="board",
    rules=(PathRule(path_pattern="/(?P<username>[^/]+)/(?P<board>[^/]+)/?"),),
)
