# Provider target development

- Every module in `providers/<provider>/targets/<target>.py` must have a
  matching live test at `tests/providers/<provider>/test_<target>.py`.
- Define each test's real public URL in `tests/live_urls.py`; test modules must
  import that constant instead of constructing or inventing URLs locally.
- A live target test must call the application using its predefined URL and
  verify the resolved provider, target type, shared response contract, and
  target-specific response fields.
- When adding a provider or target, write its live test and add its real URL to
  `tests/live_urls.py` before implementing its target module. Run the test first
  and keep it marked as an expected failure only when the failure is intentional
  and documented with `pytest.mark.xfail(strict=True, reason="...")`.
- After the test exists, implement the provider target code and remove the
  expected-failure marker once the test passes.
- Do not add response fixtures or fixture-based tests. Run the full
  `python -m pytest` suite before pushing; the pre-push hook runs this suite.
- Use Ruff for Python linting and formatting. The repository's top-level
  pre-commit hook safely auto-fixes staged Python files with `ruff check --fix`
  and `ruff format`, then stages those fixes. The top-level pre-push hook runs
  Ruff checks and the test suite. Do not enable unsafe fixes automatically or
  install app-local Git hooks.
