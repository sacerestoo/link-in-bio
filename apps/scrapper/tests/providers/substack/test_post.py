import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["substack"]["post"]
POST_SLUG = "book-review-contest-2026-winners"


@pytest.mark.live
def test_substack_post_live_response_matches_contract():
    response = process_metadata_request(LIVE_URL, provider="substack", target="post")
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "substack"
    assert response["target_type"] == "post"
    assert provider_data["slug"] == POST_SLUG
    assert provider_data["permalink"].endswith(f"/p/{POST_SLUG}")
    assert provider_data["published_at"]
    assert provider_data["authors"]
