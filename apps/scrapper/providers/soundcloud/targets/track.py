from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="track",
    rules=(PathRule(path_pattern="/(?P<username>[^/]+)/(?P<track_slug>[^/]+)/?"),),
)
