from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="author",
    rules=(PathRule(path_pattern="/@(?P<author>[^/]+)/?"),),
)
