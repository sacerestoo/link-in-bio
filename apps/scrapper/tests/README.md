# Live tests

Run `uv run --extra test pytest` to run the suite locally. Pytest loads the
repository root `.env.local` before collecting tests, so updated values are
picked up on each new run. The repository's top-level Git hooks run Ruff checks
and the complete suite before pushing.

Each implemented provider target must have a real public URL in
`tests/live_urls.py` and a matching test module under
`tests/providers/<provider>/`. Tests call the application with that URL and
validate its provider, target type, shared response, and target-specific fields.
The live suite covers CHZZK channel, Instagram profile and post, Threads profile
and post, YouTube channel and video, and X profile and tweet targets.

For a known intentional failure, use
`@pytest.mark.xfail(strict=True, reason="...")` on that target test and explain
the concrete failure. An unexpected pass then fails the suite so the marker can
be removed.
