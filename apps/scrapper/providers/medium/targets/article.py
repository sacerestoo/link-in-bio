from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="article",
    rules=(PathRule(path_pattern="/(?P<publication>[^/]+)/(?P<article_slug>[^/]+)/?"),),
)
