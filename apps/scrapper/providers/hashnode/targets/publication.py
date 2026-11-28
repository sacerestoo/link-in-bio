from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="publication",
    rules=(PathRule(path_pattern="/?"),),
)
