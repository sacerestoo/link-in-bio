import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["twitch"]["profile"]
LOGIN = "twitch"
FETCH_MODES = (("fetcher", "Fetcher"), ("session", "FetcherSession"))


@pytest.mark.live
@pytest.mark.parametrize(("mode", "expected_fetcher"), FETCH_MODES)
def test_twitch_profile_live_response_matches_contract(mode, expected_fetcher):
    response = process_metadata_request(
        LIVE_URL, provider="twitch", target="profile", mode=mode
    )
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "twitch"
    assert response["target_type"] == "profile"
    assert response["fetcher"] == expected_fetcher
    assert provider_data["login"] == LOGIN
    assert isinstance(provider_data["user_id"], str)
    assert provider_data["user_id"]
    assert type(provider_data["follower_count"]) is int
    assert provider_data["follower_count"] >= 0
    assert provider_data["image_url"] == response["image_url"]
    assert response["image_url"].startswith("https://")
