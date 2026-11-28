import json
import os

import pytest

from application.metadata_service import process_metadata_request
from tests.live_urls import LIVE_TARGET_URLS
from tests.response_contract import assert_common_response

USER_PROFILE_URL = LIVE_TARGET_URLS["github"]["user_profile"]
ORGANIZATION_PROFILE_URL = LIVE_TARGET_URLS["github"]["organization_profile"]
FETCH_MODES = (("fetcher", "Fetcher"), ("session", "FetcherSession"))


@pytest.mark.live
@pytest.mark.parametrize(("mode", "expected_fetcher"), FETCH_MODES)
def test_github_user_profile_live_response_matches_contract(mode, expected_fetcher):
    response = process_metadata_request(
        USER_PROFILE_URL, provider="github", target="profile", mode=mode
    )
    provider_data = response["provider_data"]

    assert_common_response(response, USER_PROFILE_URL)
    assert response["provider"] == "github"
    assert response["target_type"] == "profile"
    assert response["fetcher"] == expected_fetcher
    assert provider_data["username"] == "torvalds"
    assert type(provider_data["followers"]) is int
    assert provider_data["followers"] >= 0
    if os.environ.get("GITHUB_TOKEN"):
        graph = json.loads(provider_data["github_contribution_graph"])
        assert type(graph["total_contributions"]) is int
        assert graph["weeks"]


@pytest.mark.live
@pytest.mark.parametrize(("mode", "expected_fetcher"), FETCH_MODES)
def test_github_organization_profile_live_response_matches_contract(
    mode,
    expected_fetcher,
):
    response = process_metadata_request(
        ORGANIZATION_PROFILE_URL, provider="github", target="profile", mode=mode
    )
    provider_data = response["provider_data"]

    assert_common_response(response, ORGANIZATION_PROFILE_URL)
    assert response["provider"] == "github"
    assert response["target_type"] == "profile"
    assert response["fetcher"] == expected_fetcher
    assert response["title"] == "Vercel"
    assert response["image_url"].startswith("https://")
    assert provider_data["account_type"] == "Organization"
    assert provider_data["username"] == "vercel"
    assert type(provider_data["followers"]) is int
    assert provider_data["followers"] >= 0
    assert type(provider_data["public_repos"]) is int
    assert provider_data["public_repos"] >= 0
    assert type(provider_data["public_members"]) is int
    assert provider_data["public_members"] >= 0
    assert response["image_url"].startswith("https://")
