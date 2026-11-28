import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["google_play"]["app"]


@pytest.mark.live
def test_google_play_app_live_response_contains_app_details():
    response = process_metadata_request(LIVE_URL, provider="google_play", target="app")
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "google_play"
    assert response["target_type"] == "app"
    assert response["title"] == "Spotify: Music and Podcasts"
    assert provider_data["app_name"] == response["title"]
    assert provider_data["package_name"] == "com.spotify.music"
    assert provider_data["developer_name"] == "Spotify AB"
    assert isinstance(provider_data["rating"], (int, float))
    assert provider_data["rating"] > 4
    assert isinstance(provider_data["rating_count"], int)
    assert provider_data["rating_count"] > 0
