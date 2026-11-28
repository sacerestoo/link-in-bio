from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="project",
    rules=(PathRule(path_pattern="/gallery/(?P<project_id>[^/]+)/(?P<slug>[^/]+)/?"),),
)
