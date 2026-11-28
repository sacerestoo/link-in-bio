import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["x"]["profile"]


@pytest.mark.live
@pytest.mark.parametrize(
    ("mode", "expected_fetcher"),
    (("fetcher", "Fetcher"), ("session", "FetcherSession")),
)
def test_x_profile_live_response_matches_contract(mode, expected_fetcher):
    response = process_metadata_request(
        LIVE_URL, provider="x", target="profile", mode=mode
    )
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "x"
    assert response["target_type"] == "profile"
    assert response["fetcher"] == expected_fetcher
    assert type(provider_data.get("follower_count")) is int
    assert provider_data["follower_count"] >= 0
    assert type(provider_data.get("follower_count_approximate")) is bool
