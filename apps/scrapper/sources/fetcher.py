from collections.abc import Mapping
from typing import Literal

from scrapling.fetchers import Fetcher, FetcherSession

from contracts.settings import (
    ADAPTIVE_SELECTOR_CONFIG,
    MAX_REDIRECTS,
    REQUEST_TIMEOUT,
)

FetchMode = Literal["fetcher", "session"]

Fetcher.configure(**ADAPTIVE_SELECTOR_CONFIG)

FETCH_OPTIONS = {
    "timeout": REQUEST_TIMEOUT,
    "retries": 1,
    "max_redirects": MAX_REDIRECTS,
    "follow_redirects": "safe",
    "verify": True,
    "impersonate": "chrome",
    "stealthy_headers": True,
    "selector_config": ADAPTIVE_SELECTOR_CONFIG,
    "headers": {"Accept": "text/html,application/xhtml+xml"},
}


def fetch_page(
    url: str,
    mode: FetchMode,
    headers: Mapping[str, str] | None = None,
    *,
    stealthy_headers: bool | None = None,
    timeout: float | None = None,
    session: FetcherSession | None = None,
):
    request_options = {}
    if headers:
        request_options["headers"] = {**FETCH_OPTIONS["headers"], **headers}
    if stealthy_headers is not None:
        request_options["stealthy_headers"] = stealthy_headers
    if timeout is not None:
        request_options["timeout"] = timeout

    if mode == "session":
        if session is not None:
            return session.get(url, **request_options)
        with FetcherSession(**FETCH_OPTIONS) as fetcher_session:
            return fetcher_session.get(url, **request_options)

    return Fetcher.get(url, **{**FETCH_OPTIONS, **request_options})


def post_page(
    url: str,
    mode: FetchMode,
    json_body: Mapping[str, object],
    headers: Mapping[str, str] | None = None,
    *,
    session: FetcherSession | None = None,
):
    request_options = {
        "json": json_body,
        "headers": {
            **FETCH_OPTIONS["headers"],
            "Accept": "application/json",
            "Content-Type": "application/json",
            **(headers or {}),
        },
    }

    if mode == "session":
        if session is not None:
            return session.post(url, **request_options)
        with FetcherSession(**FETCH_OPTIONS) as fetcher_session:
            return fetcher_session.post(url, **request_options)

    return Fetcher.post(url, **{**FETCH_OPTIONS, **request_options})
