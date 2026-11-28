import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

ALBUM_URLS = (
    (LIVE_TARGET_URLS["youtube_music"]["album"], "MPREb_IInSY5QXXrW"),
    (
        LIVE_TARGET_URLS["youtube_music"]["album_playlist"],
        "OLAK5uy_kunInnOpcKECWIBQGB0Qj6ZjquxDvfckg",
    ),
)


@pytest.mark.live
@pytest.mark.parametrize(
    ("mode", "expected_fetcher"),
    (("fetcher", "Fetcher"), ("session", "FetcherSession")),
)
@pytest.mark.parametrize(("live_url", "album_id"), ALBUM_URLS)
def test_youtube_music_album_live_response_matches_contract(
    mode, expected_fetcher, live_url, album_id
):
    response = process_metadata_request(
        live_url, provider="youtube_music", target="album", mode=mode
    )

    assert_common_response(response, live_url)
    assert response["provider"] == "youtube_music"
    assert response["target_type"] == "album"
    assert response["fetcher"] == expected_fetcher
    provider_data = response["provider_data"]
    assert provider_data["album_id"] == album_id
    assert type(provider_data["track_count"]) is int
    assert provider_data["track_count"] > 0
    assert type(provider_data["year"]) is int
    assert provider_data["year"] > 0
    assert type(provider_data["total_duration_seconds"]) is int
    assert provider_data["total_duration_seconds"] > 0
    assert isinstance(provider_data["artist_name"], str)
    assert provider_data["artist_name"]
    assert provider_data["artist_image_url"].startswith("https://")
    assert provider_data["album_image_url"] == response["image_url"]
