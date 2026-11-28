from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="subreddit",
    rules=(PathRule(path_pattern="/r/(?P<subreddit>[^/]+)/?"),),
)
