import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["soundcloud"]["short_link"]


@pytest.mark.live
@pytest.mark.parametrize(
    ("mode", "expected_fetcher"),
    (("fetcher", "Fetcher"), ("session", "FetcherSession")),
)
def test_soundcloud_short_link_resolves_to_its_resource(mode, expected_fetcher):
    response = process_metadata_request(
        LIVE_URL, provider="soundcloud", target="short_link", mode=mode
    )
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "soundcloud"
    assert response["target_type"] == "user"
    assert response["fetcher"] == expected_fetcher
    assert response["final_url"].startswith("https://soundcloud.com/")
    assert provider_data["resource_type"] == "user"
    assert provider_data["username"]
    assert type(provider_data["followers_count"]) is int
    embed = provider_data["embed"]
    assert isinstance(embed, dict)
    assert embed["player_url"].startswith("https://w.soundcloud.com/player/")
