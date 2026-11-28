import os

import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["product_hunt"]["maker"]
FETCH_MODES = (("fetcher", "Fetcher"), ("session", "FetcherSession"))


@pytest.mark.live
@pytest.mark.xfail(
    condition=not os.environ.get("PRODUCT_HUNT_TOKEN", "").strip(),
    strict=True,
    reason="Product Hunt developer token is not configured for live tests.",
)
@pytest.mark.parametrize(("mode", "expected_fetcher"), FETCH_MODES)
def test_product_hunt_maker_live_response_matches_contract(mode, expected_fetcher):
    response = process_metadata_request(
        LIVE_URL, provider="product_hunt", target="maker", mode=mode
    )
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "product_hunt"
    assert response["target_type"] == "maker"
    assert response["fetcher"] == expected_fetcher
    assert provider_data["username"] == "levelsio"
    assert isinstance(provider_data["name"], str) and provider_data["name"]
    assert type(provider_data["followers_count"]) is int
    assert type(provider_data["is_maker"]) is bool
    assert "profile_image" in provider_data
