import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["instagram"]["post"]
SHORTCODE = "DgPNN61i4EO"


@pytest.mark.live
def test_instagram_post_live_response_matches_contract():
    response = process_metadata_request(LIVE_URL, provider="instagram", target="post")
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "instagram"
    assert response["target_type"] == "post"
    assert provider_data["shortcode"] == SHORTCODE
    assert isinstance(provider_data["username"], str) and provider_data["username"]
    assert isinstance(provider_data["caption"], str) and provider_data["caption"]
    assert type(provider_data["like_count"]) is int
    assert type(provider_data["comment_count"]) is int
