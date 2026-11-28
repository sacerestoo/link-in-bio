import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["youtube_music"]["playlist"]
PLAYLIST_ID = "PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI"


@pytest.mark.live
@pytest.mark.parametrize(
    ("mode", "expected_fetcher"),
    (("fetcher", "Fetcher"), ("session", "FetcherSession")),
)
def test_youtube_music_playlist_live_response_matches_contract(mode, expected_fetcher):
    response = process_metadata_request(LIVE_URL, mode=mode)

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "youtube_music"
    assert response["target_type"] == "playlist"
    assert response["fetcher"] == expected_fetcher
    provider_data = response["provider_data"]
    assert provider_data["playlist_id"] == PLAYLIST_ID
    assert isinstance(provider_data["playlist_title"], str)
    assert provider_data["playlist_title"]
    assert type(provider_data["track_count"]) is int
    assert provider_data["track_count"] > 0
    assert isinstance(provider_data["owner_name"], str)
    assert provider_data["owner_name"]
    assert provider_data["owner_image_url"].startswith("https://")
    assert provider_data["playlist_image_url"] == response["image_url"]
