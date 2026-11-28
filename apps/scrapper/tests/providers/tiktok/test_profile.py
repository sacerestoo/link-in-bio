import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["tiktok"]["profile"]


@pytest.mark.live
def test_tiktok_profile_live_response_matches_contract():
    response = process_metadata_request(LIVE_URL, provider="tiktok", target="profile")
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "tiktok"
    assert response["target_type"] == "profile"
    assert response["fetcher"] == "yt-dlp"
    assert isinstance(provider_data["bio"], str) and provider_data["bio"]
    assert response["description"] == provider_data["bio"]
    assert isinstance(provider_data["avatar_url"], str)
    assert provider_data["avatar_url"].startswith("https://")
    assert response["image_url"] == provider_data["avatar_url"]
    assert type(provider_data["follower_count"]) is int
    assert provider_data["follower_count"] >= 0
