import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["threads"]["profile"]
USERNAME = "threads"


@pytest.mark.live
def test_threads_profile_live_response_matches_contract():
    response = process_metadata_request(LIVE_URL)
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "threads"
    assert response["target_type"] == "profile"
    assert provider_data["username"] == USERNAME
    assert provider_data["profile_url"].startswith("https://www.threads.com/")
    assert type(provider_data["follower_count"]) is int
    assert type(provider_data["follower_count_approximate"]) is bool
