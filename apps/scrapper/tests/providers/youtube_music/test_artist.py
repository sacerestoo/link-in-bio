import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["youtube_music"]["artist"]
ARTIST_ID = "UCiGm_E4ZwYSHV3bcW1pnSeQ"


@pytest.mark.live
@pytest.mark.parametrize(
    ("mode", "expected_fetcher"),
    (("fetcher", "Fetcher"), ("session", "FetcherSession")),
)
def test_youtube_music_artist_live_response_matches_contract(mode, expected_fetcher):
    response = process_metadata_request(LIVE_URL, mode=mode)

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "youtube_music"
    assert response["target_type"] == "artist"
    assert response["fetcher"] == expected_fetcher
    provider_data = response["provider_data"]
    assert provider_data["artist_id"] == ARTIST_ID
    assert type(provider_data["subscriber_count"]) is int
    assert provider_data["subscriber_count"] > 0
    assert provider_data["subscriber_count_approximate"] is True
    assert type(provider_data["monthly_audience_count"]) is int
    assert provider_data["monthly_audience_count"] > 0
    assert provider_data["monthly_audience_count_approximate"] is True
    assert provider_data["artist_image_url"] == response["image_url"]
