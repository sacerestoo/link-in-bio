import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["soop"]["channel"]
USER_ID = "devil0108"


@pytest.mark.live
@pytest.mark.parametrize(
    ("mode", "expected_fetcher"),
    (("fetcher", "Fetcher"), ("session", "FetcherSession")),
)
def test_soop_channel_live_response_matches_contract(mode, expected_fetcher):
    response = process_metadata_request(LIVE_URL, mode=mode)
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "soop"
    assert response["target_type"] == "channel"
    assert response["fetcher"] == expected_fetcher
    assert provider_data["user_id"] == USER_ID
    assert isinstance(provider_data["user_name"], str) and provider_data["user_name"]
    assert (
        isinstance(provider_data["station_name"], str) and provider_data["station_name"]
    )
    assert (
        isinstance(provider_data["station_title"], str)
        and provider_data["station_title"]
    )
    assert (
        isinstance(provider_data["profile_text"], str) and provider_data["profile_text"]
    )
    assert provider_data["profile_image"].startswith("https://")
    assert type(provider_data["favorite_count"]) is int
    assert provider_data["favorite_count"] > 0
