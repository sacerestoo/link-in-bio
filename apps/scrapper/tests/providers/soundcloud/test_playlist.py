import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["soundcloud"]["playlist"]


@pytest.mark.live
@pytest.mark.parametrize(
    ("mode", "expected_fetcher"),
    (("fetcher", "Fetcher"), ("session", "FetcherSession")),
)
def test_soundcloud_playlist_live_response_contains_track_list(mode, expected_fetcher):
    response = process_metadata_request(
        LIVE_URL, provider="soundcloud", target="playlist", mode=mode
    )
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "soundcloud"
    assert response["target_type"] == "playlist"
    assert response["fetcher"] == expected_fetcher
    assert provider_data["resource_type"] == "playlist"
    assert provider_data["title"] == "Soulhack"
    assert type(provider_data["track_count"]) is int
    assert provider_data["track_count"] > 0
    assert isinstance(provider_data["tracks"], list)
    assert provider_data["tracks"]
    assert provider_data["tracks"][0]["title"]
    embed = provider_data["embed"]
    assert isinstance(embed, dict)
    assert embed["author_name"] == "Forss"
    assert embed["player_url"].startswith("https://w.soundcloud.com/player/")
