from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="creator",
    rules=(PathRule(path_pattern="/(?P<creator>[^/]+)/?", requires_host_param=False),),
)
