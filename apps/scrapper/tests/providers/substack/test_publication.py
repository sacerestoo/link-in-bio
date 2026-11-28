import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["substack"]["publication"]


@pytest.mark.live
def test_substack_publication_live_response_matches_contract():
    response = process_metadata_request(
        LIVE_URL, provider="substack", target="publication"
    )
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "substack"
    assert response["target_type"] == "publication"
    assert provider_data["publication_name"] == "Astral Codex Ten"
    assert provider_data["publication_url"].startswith("https://")
    assert provider_data["feed_url"].endswith("/feed")
    assert provider_data["item_count"] > 0
