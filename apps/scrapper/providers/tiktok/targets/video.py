from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="video",
    rules=(PathRule(path_pattern="/@(?P<handle>[^/]+)/video/(?P<video_id>[^/]+)/?"),),
)
