import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["instagram"]["profile"]
USERNAME = "stelliveofficial"


@pytest.mark.live
def test_instagram_profile_live_response_matches_contract():
    response = process_metadata_request(LIVE_URL)
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "instagram"
    assert response["target_type"] == "profile"
    assert provider_data["username"] == USERNAME
    assert type(provider_data["follower_count"]) is int
    assert (
        "following_count" not in provider_data
        or type(provider_data["following_count"]) is int
    )
    assert type(provider_data["post_count"]) is int
    recent_posts = provider_data["recent_posts"]
    assert isinstance(recent_posts, list) and len(recent_posts) == 4
    assert all(
        isinstance(post, dict)
        and isinstance(post.get("shortcode"), str)
        and post.get("permalink", "").startswith("https://www.instagram.com/")
        and post.get("thumbnail_url", "").startswith("https://")
        for post in recent_posts
    )
