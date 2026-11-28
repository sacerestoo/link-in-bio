from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="community_file",
    rules=(
        PathRule(path_pattern="/community/file/(?P<file_id>[^/]+)/(?P<slug>[^/]+)/?"),
    ),
)
