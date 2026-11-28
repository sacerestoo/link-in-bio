import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["facebook"]["post"]
POST_ID = "1700684364760266"


@pytest.mark.live
def test_facebook_post_live_response_matches_contract():
    response = process_metadata_request(LIVE_URL, provider="facebook", target="post")
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "facebook"
    assert response["target_type"] == "post"
    assert provider_data["available"] is True
    assert provider_data["post_id"] == POST_ID
    assert provider_data["author_name"]
    author_url = provider_data["author_url"]
    assert isinstance(author_url, str) and author_url.startswith(
        "https://www.facebook.com/"
    )
    author_image_url = provider_data["author_image_url"]
    assert isinstance(author_image_url, str) and author_image_url.startswith("https://")
    assert provider_data["text"]
    assert isinstance(provider_data["text_excerpt"], str)
    assert len(provider_data["text_excerpt"]) <= 280
    assert provider_data["created_at"]
    assert type(provider_data["like_count"]) is int
    assert type(provider_data["reaction_count"]) is int
    assert provider_data["like_count"] <= provider_data["reaction_count"]
    assert type(provider_data["comment_count"]) is int
    assert type(provider_data["share_count"]) is int
    image_url = response["image_url"]
    assert isinstance(image_url, str) and image_url.startswith("https://")
