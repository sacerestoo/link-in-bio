import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["youtube_music"]["video"]
VIDEO_ID = "9dobJDxPEzM"


@pytest.mark.live
@pytest.mark.parametrize(
    ("mode", "expected_fetcher"),
    (("fetcher", "Fetcher"), ("session", "FetcherSession")),
)
def test_youtube_music_video_live_response_matches_contract(mode, expected_fetcher):
    response = process_metadata_request(
        LIVE_URL, provider="youtube_music", target="video", mode=mode
    )

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "youtube_music"
    assert response["target_type"] == "video"
    assert response["fetcher"] == expected_fetcher
    provider_data = response["provider_data"]
    assert provider_data["video_id"] == VIDEO_ID
    assert type(provider_data["view_count"]) is int
    assert provider_data["view_count"] > 0
    assert type(provider_data["like_count"]) is int
    assert provider_data["like_count"] >= 0
    assert provider_data["video_image_url"] == response["image_url"]
