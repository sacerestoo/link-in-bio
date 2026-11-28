import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

REPOSITORY_URL = LIVE_TARGET_URLS["github"]["repository"]
FETCH_MODES = (("fetcher", "Fetcher"), ("session", "FetcherSession"))


@pytest.mark.live
@pytest.mark.parametrize(("mode", "expected_fetcher"), FETCH_MODES)
def test_github_repository_live_response_matches_contract(mode, expected_fetcher):
    response = process_metadata_request(REPOSITORY_URL, mode=mode)
    provider_data = response["provider_data"]

    assert_common_response(response, REPOSITORY_URL)
    assert response["provider"] == "github"
    assert response["target_type"] == "repository"
    assert response["fetcher"] == expected_fetcher
    assert response["title"] == "vercel/next.js"
    assert response["description"]
    assert provider_data["owner"] == "vercel"
    assert provider_data["name"] == "next.js"
    assert provider_data["full_name"] == "vercel/next.js"
    assert type(provider_data["star_count"]) is int
    assert provider_data["star_count"] > 0
    assert type(provider_data["fork_count"]) is int
    assert provider_data["fork_count"] >= 0
    assert isinstance(provider_data["pushed_at"], str)
    assert provider_data["pushed_at"]
    assert isinstance(response["image_url"], str)
    assert response["image_url"].startswith("https://")
