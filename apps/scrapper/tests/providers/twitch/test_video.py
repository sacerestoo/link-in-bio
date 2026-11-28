import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["twitch"]["video"]
VIDEO_ID = "2844385157"
FETCH_MODES = (("fetcher", "Fetcher"), ("session", "FetcherSession"))


@pytest.mark.live
@pytest.mark.parametrize(("mode", "expected_fetcher"), FETCH_MODES)
@pytest.mark.xfail(
    strict=True,
    reason=(
        "Twitch returns an empty Videos API data array in regions where videos "
        "are unavailable; this live test runs from South Korea."
    ),
)
def test_twitch_video_live_response_matches_contract(
    mode,
    expected_fetcher,
    twitch_credentials,
):
    access_token, client_id = twitch_credentials
    response = process_metadata_request(
        LIVE_URL,
        provider="twitch",
        target="video",
        mode=mode,
        access_token=access_token,
        client_id=client_id,
    )
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "twitch"
    assert response["target_type"] == "video"
    assert response["fetcher"] == expected_fetcher
    assert provider_data["video_id"] == VIDEO_ID
    assert isinstance(provider_data["user_id"], str)
    assert provider_data["user_id"]
    assert isinstance(provider_data["user_login"], str)
    assert provider_data["user_login"]
    assert type(provider_data["view_count"]) is int
    assert provider_data["view_count"] >= 0
    assert provider_data["image_url"] == response["image_url"]
