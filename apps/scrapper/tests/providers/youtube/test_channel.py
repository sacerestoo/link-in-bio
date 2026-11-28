import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["youtube"]["channel"]
CHANNEL_ID = "UCXZCJLdBC09xxGZ6gcdrc6A"


@pytest.mark.live
@pytest.mark.parametrize(
    ("mode", "expected_fetcher"),
    (("fetcher", "Fetcher"), ("session", "FetcherSession")),
)
def test_youtube_channel_live_response_matches_contract(mode, expected_fetcher):
    response = process_metadata_request(LIVE_URL, mode=mode)
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "youtube"
    assert response["target_type"] == "channel"
    assert response["fetcher"] == expected_fetcher
    assert provider_data["channel_id"] == CHANNEL_ID
    assert isinstance(provider_data["channel_title"], str)
    assert provider_data["channel_title"]
    assert type(provider_data["subscriber_count"]) is int
    assert provider_data["subscriber_count"] > 0
    assert provider_data["channel_image_url"].startswith("https://")
