import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["youtube"]["video"]
VIDEO_ID = "jfKfPfyJRdk"


@pytest.mark.live
@pytest.mark.parametrize(
    ("mode", "expected_fetcher"),
    (("fetcher", "Fetcher"), ("session", "FetcherSession")),
)
def test_youtube_video_live_response_matches_contract(mode, expected_fetcher):
    response = process_metadata_request(
        LIVE_URL, provider="youtube", target="video", mode=mode
    )
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "youtube"
    assert response["target_type"] == "video"
    assert response["fetcher"] == expected_fetcher
    assert provider_data["video_id"] == VIDEO_ID
    assert type(provider_data["view_count"]) is int
    assert provider_data["view_count"] >= 0
    assert isinstance(provider_data["channel_id"], str)
    assert provider_data["channel_id"]
