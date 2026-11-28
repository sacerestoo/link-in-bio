import re
from collections.abc import Mapping

from scrapling.fetchers import Fetcher

from contracts.response import MetadataResponse
from contracts.settings import ADAPTIVE_SELECTORS_ENABLED
from sources.fetcher import FETCH_OPTIONS


def _assert_snake_case_keys(value: object) -> None:
    if isinstance(value, Mapping):
        for key, item in value.items():
            assert isinstance(key, str)
            assert re.fullmatch(r"[a-z][a-z0-9]*(?:_[a-z0-9]+)*", key), key
            _assert_snake_case_keys(item)
    elif isinstance(value, (list, tuple)):
        for item in value:
            _assert_snake_case_keys(item)


def assert_common_response(response: Mapping[str, object], requested_url: str) -> None:
    assert Fetcher.adaptive is ADAPTIVE_SELECTORS_ENABLED
    assert FETCH_OPTIONS["selector_config"]["adaptive"] is ADAPTIVE_SELECTORS_ENABLED
    assert MetadataResponse.__required_keys__ <= response.keys()
    assert response["requested_url"] == requested_url
    assert isinstance(response["final_url"], str) and response["final_url"]
    assert 200 <= response["http_status"] < 300
    assert isinstance(response["title"], str)
    assert isinstance(response["description"], str)
    assert isinstance(response["image_url"], str)
    assert isinstance(response["site_name"], str)
    assert isinstance(response["type"], str)
    assert isinstance(response["canonical_url"], str)
    assert isinstance(response["favicon_url"], str)
    assert isinstance(response["provider_data"], dict)
    _assert_snake_case_keys(response)
