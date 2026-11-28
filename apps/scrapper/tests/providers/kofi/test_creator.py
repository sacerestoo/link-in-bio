import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["ko_fi"]["creator"]
FETCH_MODES = (("fetcher", "Fetcher"), ("session", "FetcherSession"))


@pytest.mark.live
@pytest.mark.parametrize(("mode", "expected_fetcher"), FETCH_MODES)
def test_ko_fi_creator_live_response_matches_contract(mode, expected_fetcher):
    response = process_metadata_request(
        LIVE_URL, provider="ko_fi", target="creator", mode=mode
    )
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "ko_fi"
    assert response["target_type"] == "creator"
    assert response["fetcher"] == expected_fetcher
    assert isinstance(provider_data["creator_handle"], str)
    assert provider_data["creator_handle"]
    assert isinstance(provider_data["display_name"], str)
    assert provider_data["display_name"]
    assert isinstance(provider_data["bio"], str) and provider_data["bio"]
    assert type(provider_data["supporter_count"]) is int
    assert provider_data["supporter_count"] > 0
    assert provider_data["profile_image_url"].startswith("https://")
    assert provider_data["support_url"].startswith("https://ko-fi.com/")
