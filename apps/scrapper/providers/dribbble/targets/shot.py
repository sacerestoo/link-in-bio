from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="shot",
    rules=(PathRule(path_pattern="/shots/(?P<shot_id>[^/-]+)-(?P<slug>[^/]+)/?"),),
)
