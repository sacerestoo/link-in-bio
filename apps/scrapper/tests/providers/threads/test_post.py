import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

LIVE_URL = LIVE_TARGET_URLS["threads"]["post"]
USERNAME = "threads"
POST_ID = "DCkkKl_OGb1"


@pytest.mark.live
def test_threads_post_live_response_matches_contract():
    response = process_metadata_request(LIVE_URL, provider="threads", target="post")
    provider_data = response["provider_data"]

    assert_common_response(response, LIVE_URL)
    assert response["provider"] == "threads"
    assert response["target_type"] == "post"
    assert provider_data["username"] == USERNAME
    assert provider_data["post_id"] == POST_ID
    assert provider_data["permalink"].startswith("https://www.threads.com/")
    assert isinstance(provider_data["text"], str)
    assert type(provider_data["like_count"]) is int
