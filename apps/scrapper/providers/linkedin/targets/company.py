from routing.path_target import PathRule, PathTarget

TARGET = PathTarget(
    target_type="company",
    rules=(PathRule(path_pattern="/company/(?P<organization_slug>[^/]+)/?"),),
)
