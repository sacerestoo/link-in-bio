import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["discord"]["invite"]


@pytest.mark.live
def test_discord_invite_live_response_matches_contract():
    response = process_metadata_request(LIVE_URL)
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "discord"
    assert response["target_type"] == "invite"
    assert provider_data["invite_code"] == "discord-developers"
    assert provider_data["guild_name"] == "Discord Developers"
    assert "guild_id" not in provider_data
    assert "channel_id" not in provider_data
    assert "channel_name" not in provider_data
    assert type(provider_data["approximate_member_count"]) is int
    assert provider_data["approximate_member_count"] > 0
    assert type(provider_data["approximate_presence_count"]) is int
    assert provider_data["approximate_presence_count"] >= 0
