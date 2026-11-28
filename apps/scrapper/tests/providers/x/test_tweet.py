import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["x"]["tweet"]
REQUIRED_PROVIDER_DATA = {
    "id_str",
    "text",
    "created_at",
    "lang",
    "display_text_range",
    "user",
    "entities",
    "media_details",
}


@pytest.mark.live
@pytest.mark.parametrize(
    ("mode", "expected_fetcher"),
    (("fetcher", "Fetcher"), ("session", "FetcherSession")),
)
def test_x_tweet_live_response_matches_contract(mode, expected_fetcher):
    response = process_metadata_request(LIVE_URL, mode=mode)
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "x"
    assert response["target_type"] == "tweet"
    assert response["fetcher"] == expected_fetcher
    assert REQUIRED_PROVIDER_DATA <= provider_data.keys()
    assert provider_data["id_str"] == "2040511285998313827"
    assert isinstance(provider_data["text"], str) and provider_data["text"]
    assert isinstance(provider_data["user"], dict)
    assert isinstance(provider_data["entities"], dict)
    assert isinstance(provider_data["media_details"], list)
