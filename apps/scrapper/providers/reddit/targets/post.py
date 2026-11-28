from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="post",
    rules=(
        PathRule(
            path_pattern="/r/(?P<subreddit>[^/]+)/comments/(?P<post_id>[^/]+)(?:/[^/]+)?/?"
        ),
    ),
)
