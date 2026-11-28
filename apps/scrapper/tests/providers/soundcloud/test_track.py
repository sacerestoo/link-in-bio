import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["soundcloud"]["track"]


@pytest.mark.live
@pytest.mark.parametrize(
    ("mode", "expected_fetcher"),
    (("fetcher", "Fetcher"), ("session", "FetcherSession")),
)
def test_soundcloud_track_live_response_contains_track_details(mode, expected_fetcher):
    response = process_metadata_request(
        LIVE_URL, provider="soundcloud", target="track", mode=mode
    )
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "soundcloud"
    assert response["target_type"] == "track"
    assert response["fetcher"] == expected_fetcher
    assert provider_data["resource_type"] == "track"
    assert provider_data["resource_id"] == "293"
    assert provider_data["title"] == "Flickermood"
    assert provider_data["artist_name"] == "Forss"
    assert type(provider_data["duration_ms"]) is int
    assert type(provider_data["playback_count"]) is int
    assert type(provider_data["likes_count"]) is int
    assert type(provider_data["comment_count"]) is int
    embed = provider_data["embed"]
    assert isinstance(embed, dict)
    assert embed["author_url"].startswith("https://soundcloud.com/")
    assert embed["player_url"].startswith("https://w.soundcloud.com/player/")
