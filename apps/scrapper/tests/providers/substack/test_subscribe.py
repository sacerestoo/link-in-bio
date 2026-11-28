import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["substack"]["subscribe"]


@pytest.mark.live
def test_substack_subscribe_live_response_matches_contract():
    response = process_metadata_request(
        LIVE_URL, provider="substack", target="subscribe"
    )
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "substack"
    assert response["target_type"] == "subscribe"
    assert provider_data["subscribe_url"].endswith("/subscribe")
    assert provider_data["publication_name"] == "Astral Codex Ten"
