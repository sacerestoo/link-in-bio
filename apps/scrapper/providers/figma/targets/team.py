from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="team",
    rules=(PathRule(path_pattern="/team/(?P<team_id>[^/]+)/(?P<team_name>[^/]+)/?"),),
)
