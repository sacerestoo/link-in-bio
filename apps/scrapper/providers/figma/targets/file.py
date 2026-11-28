from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="file",
    rules=(PathRule(path_pattern="/file/(?P<file_id>[^/]+)/(?P<file_name>[^/]+)/?"),),
)
