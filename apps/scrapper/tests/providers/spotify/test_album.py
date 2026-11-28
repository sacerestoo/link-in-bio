import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["spotify"]["album"]
RESOURCE_ID = "00x7wb3nZ4UCqAjOMhaN9P"


@pytest.mark.live
@pytest.mark.parametrize(
    ("mode", "expected_fetcher"),
    (("fetcher", "Fetcher"), ("session", "FetcherSession")),
)
def test_spotify_album_live_response_contains_embed_preview_and_tracks(
    mode, expected_fetcher
):
    response = process_metadata_request(
        LIVE_URL, provider="spotify", target="album", mode=mode
    )

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "spotify"
    assert response["target_type"] == "album"
    assert response["fetcher"] == expected_fetcher
    assert response["title"] != "Spotify – Web Player"
    provider_data = response["provider_data"]
    assert provider_data["resource_type"] == "album"
    assert provider_data["resource_id"] == RESOURCE_ID
    assert provider_data["spotify_uri"] == f"spotify:album:{RESOURCE_ID}"
    preview = provider_data["preview"]
    assert preview["type"] == "album"
    assert preview["title"] == response["title"]
    assert preview["track"]
    assert preview["image"].startswith("https://")
    assert preview["link"] == LIVE_URL
    tracks = provider_data["tracks"]
    assert tracks and len(tracks) <= 100
    assert tracks[0]["name"]
