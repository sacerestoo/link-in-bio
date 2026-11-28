import os

import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["chzzk"]["channel"]
CHANNEL_ID = "a6c4ddb09cdb160478996007bff35296"


@pytest.mark.live
@pytest.mark.xfail(
    condition=not (
        os.environ.get("CHZZK_CLIENT_ID") and os.environ.get("CHZZK_CLIENT_SECRET")
    ),
    strict=True,
    reason="CHZZK Client credentials are not configured for this live test run.",
)
@pytest.mark.parametrize(
    ("mode", "expected_fetcher"),
    (("fetcher", "Fetcher"), ("session", "FetcherSession")),
)
def test_chzzk_channel_live_response_matches_contract(mode, expected_fetcher):
    response = process_metadata_request(LIVE_URL, mode=mode)
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "chzzk"
    assert response["target_type"] == "channel"
    assert response["fetcher"] == expected_fetcher
    assert provider_data["channel_id"] == CHANNEL_ID
    assert (
        isinstance(provider_data["channel_name"], str) and provider_data["channel_name"]
    )
    assert type(provider_data["follower_count"]) is int
    assert provider_data["follower_count"] >= 0
    assert type(provider_data["verified_mark"]) is bool
