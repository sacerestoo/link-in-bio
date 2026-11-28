import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["facebook"]["profile"]
USERNAME = "NASA"


@pytest.mark.live
def test_facebook_profile_live_response_matches_contract():
    response = process_metadata_request(LIVE_URL, provider="facebook", target="profile")
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "facebook"
    assert response["target_type"] == "profile"
    assert provider_data["username"] == USERNAME
    assert provider_data["display_name"]
    profile_image_url = provider_data["profile_image_url"]
    assert isinstance(profile_image_url, str) and profile_image_url.startswith(
        "https://"
    )
    assert type(provider_data["follower_count"]) is int
    assert type(provider_data["talking_about_count"]) is int
    assert provider_data["description"]
