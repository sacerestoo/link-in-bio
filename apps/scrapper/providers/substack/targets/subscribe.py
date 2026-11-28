from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="subscribe",
    rules=(PathRule(path_pattern="/subscribe/?"),),
)
