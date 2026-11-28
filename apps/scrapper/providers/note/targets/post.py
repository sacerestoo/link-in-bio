from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="post",
    rules=(PathRule(path_pattern="/(?P<creator>[^/]+)/n/(?P<note_id>[^/]+)/?"),),
)
