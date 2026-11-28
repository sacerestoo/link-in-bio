import os

import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

PRODUCT_URLS = (
    (LIVE_TARGET_URLS["product_hunt"]["product"], "cursor"),
    (LIVE_TARGET_URLS["product_hunt"]["legacy_product"], "userwatch-2"),
)
FETCH_MODES = (("fetcher", "Fetcher"), ("session", "FetcherSession"))


@pytest.mark.live
@pytest.mark.xfail(
    condition=not os.environ.get("PRODUCT_HUNT_TOKEN", "").strip(),
    strict=True,
    reason="Product Hunt developer token is not configured for live tests.",
)
@pytest.mark.parametrize(("mode", "expected_fetcher"), FETCH_MODES)
@pytest.mark.parametrize(("live_url", "expected_slug"), PRODUCT_URLS)
def test_product_hunt_product_live_response_matches_contract(
    live_url,
    expected_slug,
    mode,
    expected_fetcher,
):
    response = process_metadata_request(live_url, mode=mode)
    provider_data = response["provider_data"]

    assert_common_response(response, live_url)
    assert response["provider"] == "product_hunt"
    assert response["target_type"] == "product"
    assert response["fetcher"] == expected_fetcher
    assert provider_data["slug"] == expected_slug
    assert response["title"] == provider_data["name"]
    assert isinstance(provider_data["tagline"], str) and provider_data["tagline"]
    assert type(provider_data["votes_count"]) is int
    assert provider_data["votes_count"] >= 0
    if expected_slug == "cursor":
        assert any(
            isinstance(maker.get("profile_image"), str)
            and maker["profile_image"].startswith("https://")
            for maker in provider_data["makers"]
        )
