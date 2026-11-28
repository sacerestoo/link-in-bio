import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["soundcloud"]["user"]


@pytest.mark.live
@pytest.mark.parametrize(
    ("mode", "expected_fetcher"),
    (("fetcher", "Fetcher"), ("session", "FetcherSession")),
)
def test_soundcloud_user_live_response_contains_profile_counts(mode, expected_fetcher):
    response = process_metadata_request(
        LIVE_URL, provider="soundcloud", target="user", mode=mode
    )
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "soundcloud"
    assert response["target_type"] == "user"
    assert response["fetcher"] == expected_fetcher
    assert provider_data["resource_type"] == "user"
    assert provider_data["username"] == "forss"
    assert provider_data["display_name"] == "Forss"
    assert type(provider_data["followers_count"]) is int
    assert type(provider_data["followings_count"]) is int
    assert type(provider_data["track_count"]) is int
    assert type(provider_data["playlist_count"]) is int
    assert type(provider_data["verified"]) is bool
    embed = provider_data["embed"]
    assert isinstance(embed, dict)
    assert embed["author_name"] == "Forss"
    assert embed["player_url"].startswith("https://w.soundcloud.com/player/")
