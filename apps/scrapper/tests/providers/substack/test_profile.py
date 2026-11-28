import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["substack"]["profile"]
HANDLE = "astralcodexten"


@pytest.mark.live
def test_substack_profile_live_response_matches_contract():
    response = process_metadata_request(LIVE_URL, provider="substack", target="profile")
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "substack"
    assert response["target_type"] == "profile"
    assert provider_data["handle"] == HANDLE
    assert provider_data["profile_url"] == LIVE_URL
    assert provider_data["display_name"] == "Scott Alexander"
    assert provider_data["publications"]
