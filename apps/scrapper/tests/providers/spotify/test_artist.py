import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["spotify"]["artist"]
RESOURCE_ID = "5a2w2tgpLwv26BYJf2qYwu"


@pytest.mark.live
@pytest.mark.parametrize(
    ("mode", "expected_fetcher"),
    (("fetcher", "Fetcher"), ("session", "FetcherSession")),
)
def test_spotify_artist_live_response_contains_embed_preview_and_tracks(
    mode, expected_fetcher
):
    response = process_metadata_request(
        LIVE_URL, provider="spotify", target="artist", mode=mode
    )

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "spotify"
    assert response["target_type"] == "artist"
    assert response["fetcher"] == expected_fetcher
    assert response["title"] != "Spotify – Web Player"
    provider_data = response["provider_data"]
    assert provider_data["resource_type"] == "artist"
    assert provider_data["resource_id"] == RESOURCE_ID
    assert provider_data["spotify_uri"] == f"spotify:artist:{RESOURCE_ID}"
    preview = provider_data["preview"]
    assert preview["type"] == "artist"
    assert preview["title"] == response["title"] == "SOPHIE"
    assert preview["track"]
    assert preview["image"].startswith("https://")
    assert preview["link"] == LIVE_URL
    assert preview["embed"].startswith("https://embed.spotify.com/?uri=")
    tracks = provider_data["tracks"]
    assert tracks and len(tracks) <= 100
    assert tracks[0]["name"]
