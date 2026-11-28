from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="proto",
    rules=(PathRule(path_pattern="/proto/(?P<file_id>[^/]+)/(?P<file_name>[^/]+)/?"),),
)
