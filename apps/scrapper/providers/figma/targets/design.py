from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="design",
    rules=(PathRule(path_pattern="/design/(?P<file_id>[^/]+)/(?P<file_name>[^/]+)/?"),),
)
