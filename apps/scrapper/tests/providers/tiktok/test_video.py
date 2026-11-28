import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["tiktok"]["video"]
VIDEO_ID = "7047596209028074758"


@pytest.mark.live
def test_tiktok_video_live_response_matches_contract():
    response = process_metadata_request(LIVE_URL, provider="tiktok", target="video")
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "tiktok"
    assert response["target_type"] == "video"
    assert response["fetcher"] == "yt-dlp"
    assert provider_data["video_id"] == VIDEO_ID
    assert provider_data["username"] == "hankgreen1"
    assert isinstance(response["title"], str) and response["title"]
    assert isinstance(response["image_url"], str)
    assert response["image_url"].startswith("https://")
    assert type(provider_data["view_count"]) is int
    assert provider_data["view_count"] >= 0
