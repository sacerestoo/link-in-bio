import json
import os
import re
from collections.abc import Mapping
from dataclasses import dataclass
from urllib.parse import parse_qs, quote, urlsplit

from scrapling.fetchers import Fetcher, FetcherSession

from contracts.errors import MetadataRequestError
from contracts.response import ExtractedMetadata
from sources.fetcher import FETCH_OPTIONS, FetchMode, fetch_page

_API_BASE_URL = "https://api.github.com"
_GRAPHQL_URL = f"{_API_BASE_URL}/graphql"
_FAVICON_URL = "https://github.com/favicon.ico"
_LOGIN = re.compile(r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?\Z")

_USER_CONTRIBUTION_QUERY = """
query ($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        colors
        weeks {
          contributionDays {
            contributionCount
            contributionLevel
            color
            weekday
          }
        }
      }
    }
  }
}
"""

_REPOSITORY_IMAGE_QUERY = """
query ($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    openGraphImageUrl
    usesCustomOpenGraphImage
  }
}
"""


@dataclass(frozen=True, slots=True)
class GithubApiPage:
    body: bytes
    status: int
    url: str
    headers: Mapping[str, str]


def _path_segments(url: str) -> list[str]:
    return [segment for segment in urlsplit(url).path.split("/") if segment]


def _profile_login(url: str) -> str:
    segments = _path_segments(url)
    login = segments[0] if len(segments) == 1 else ""
    if _LOGIN.fullmatch(login) is None:
        raise MetadataRequestError("The GitHub profile URL is invalid.")
    return login


def _repository_path(url: str) -> tuple[str, str]:
    segments = _path_segments(url)
    owner, repository = (segments + [""])[:2]
    repository = repository.removesuffix(".git")
    if _LOGIN.fullmatch(owner) is None or not repository:
        raise MetadataRequestError("The GitHub repository URL is invalid.")
    return owner, repository


def _github_headers(*, json_body: bool = False) -> dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "URL Metadata/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if json_body:
        headers["Content-Type"] = "application/json"
    return headers


def _github_token() -> str:
    return os.environ.get("GITHUB_TOKEN", "").strip()


def _as_mapping(value: object) -> Mapping[str, object]:
    return value if isinstance(value, Mapping) else {}


def _as_string(value: object) -> str:
    return value if isinstance(value, str) else ""


def _as_count(value: object) -> int | None:
    if isinstance(value, int) and not isinstance(value, bool) and value >= 0:
        return value
    return None


def _json_object(page: object) -> dict[str, object]:
    body = getattr(page, "body", b"") or b""
    try:
        payload = json.loads(body)
    except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
        raise MetadataRequestError(
            "The GitHub API returned invalid JSON.", 502
        ) from None
    if not isinstance(payload, dict):
        raise MetadataRequestError(
            "The GitHub API returned an invalid response.",
            502,
        )
    return payload


def _json_array(page: object) -> list[object] | None:
    body = getattr(page, "body", b"") or b""
    try:
        payload = json.loads(body)
    except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
        return None
    return payload if isinstance(payload, list) else None


def _api_page(url: str, mode: FetchMode):
    return fetch_page(
        url,
        mode,
        headers=_github_headers(),
        stealthy_headers=False,
    )


def _graphql_page(
    query: str,
    variables: Mapping[str, str],
    mode: FetchMode,
):
    headers = _github_headers(json_body=True)
    if mode == "session":
        with FetcherSession(**FETCH_OPTIONS) as session:
            return session.post(
                _GRAPHQL_URL,
                headers=headers,
                json={"query": query, "variables": dict(variables)},
                stealthy_headers=False,
            )
    return Fetcher.post(
        _GRAPHQL_URL,
        **{
            **FETCH_OPTIONS,
            "headers": {**FETCH_OPTIONS["headers"], **headers},
            "json": {"query": query, "variables": dict(variables)},
            "stealthy_headers": False,
        },
    )


def _graphql_data(page: object) -> Mapping[str, object] | None:
    if not 200 <= getattr(page, "status", 0) < 300:
        return None
    try:
        payload = json.loads(getattr(page, "body", b"") or b"")
    except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
        return None
    if not isinstance(payload, dict) or payload.get("errors"):
        return None
    return _as_mapping(payload.get("data"))


def _contribution_graph(login: str, mode: FetchMode) -> str | None:
    if not _github_token():
        return None
    page = _graphql_page(_USER_CONTRIBUTION_QUERY, {"login": login}, mode)
    data = _graphql_data(page)
    user = _as_mapping(data.get("user")) if data else {}
    collection = _as_mapping(user.get("contributionsCollection"))
    calendar = _as_mapping(collection.get("contributionCalendar"))
    weeks_data = calendar.get("weeks")
    total = _as_count(calendar.get("totalContributions"))
    if total is None or not isinstance(weeks_data, list):
        return None

    colors = calendar.get("colors")
    default_color = (
        next((color for color in colors if isinstance(color, str)), "#ebedf0")
        if isinstance(colors, list)
        else "#ebedf0"
    )
    levels = {
        "NONE": 0,
        "FIRST_QUARTILE": 1,
        "SECOND_QUARTILE": 2,
        "THIRD_QUARTILE": 3,
        "FOURTH_QUARTILE": 4,
    }
    weeks = []
    for value in weeks_data:
        week = _as_mapping(value)
        days = [
            {"count": 0, "level": 0, "color": default_color, "weekday": weekday}
            for weekday in range(7)
        ]
        contribution_days = week.get("contributionDays")
        if isinstance(contribution_days, list):
            for day_value in contribution_days:
                day = _as_mapping(day_value)
                weekday = day.get("weekday")
                if not isinstance(weekday, int) or isinstance(weekday, bool):
                    continue
                if weekday < 0 or weekday > 6:
                    continue
                count = _as_count(day.get("contributionCount"))
                level = levels.get(_as_string(day.get("contributionLevel")), 0)
                color = _as_string(day.get("color")) or default_color
                days[weekday] = {
                    "count": count or 0,
                    "level": level,
                    "color": color,
                    "weekday": weekday,
                }
        weeks.append({"days": days})

    return json.dumps({"total_contributions": total, "weeks": weeks})


def _header(page: object, name: str) -> str:
    headers = getattr(page, "headers", {})
    if not isinstance(headers, Mapping):
        return ""
    for key, value in headers.items():
        if str(key).casefold() == name.casefold():
            return str(value)
    return ""


def _link_url(link_header: str, relation: str) -> str:
    for item in link_header.split(","):
        match = re.fullmatch(r'\s*<([^>]+)>\s*;\s*rel="([^"]+)"\s*', item)
        if match and match.group(2) == relation:
            return match.group(1)
    return ""


def _public_member_count(login: str, mode: FetchMode) -> int | None:
    url = f"{_API_BASE_URL}/orgs/{quote(login, safe='')}/public_members?per_page=100"
    page = _api_page(url, mode)
    if not 200 <= page.status < 300:
        return None
    members = _json_array(page)
    if members is None:
        return None

    link_header = _header(page, "Link")
    last_url = _link_url(link_header, "last")
    if last_url:
        last_query = parse_qs(urlsplit(last_url).query)
        page_values = last_query.get("page", ["1"])
        try:
            last_page = int(page_values[0])
        except ValueError:
            return None
        if last_page <= 1:
            return len(members)
        last_page_response = _api_page(last_url, mode)
        if not 200 <= last_page_response.status < 300:
            return None
        last_members = _json_array(last_page_response)
        if last_members is None:
            return None
        return (last_page - 1) * 100 + len(last_members)

    next_url = _link_url(link_header, "next")
    if not next_url:
        return len(members)

    count = len(members)
    while next_url:
        next_page = _api_page(next_url, mode)
        if not 200 <= next_page.status < 300:
            return None
        next_members = _json_array(next_page)
        if next_members is None:
            return None
        count += len(next_members)
        next_url = _link_url(_header(next_page, "Link"), "next")
    return count


def fetch_profile(url: str, mode: FetchMode, headers=None):
    login = _profile_login(url)
    page = _api_page(
        f"{_API_BASE_URL}/users/{quote(login, safe='')}",
        mode,
    )
    if not 200 <= page.status < 300:
        return page

    profile = _json_object(page)
    profile_type = _as_string(profile.get("type"))
    extras: dict[str, object] = {}
    if profile_type == "User":
        graph = _contribution_graph(login, mode)
        if graph:
            extras["githubContributionGraph"] = graph
    elif profile_type == "Organization":
        public_members = _public_member_count(login, mode)
        if public_members is not None:
            extras["publicMembers"] = public_members

    return GithubApiPage(
        body=json.dumps({"kind": "profile", "profile": profile, **extras}).encode(),
        status=page.status,
        url=page.url,
        headers={"content-type": "application/json"},
    )


def fetch_repository(url: str, mode: FetchMode, headers=None):
    owner, name = _repository_path(url)
    api_url = f"{_API_BASE_URL}/repos/{quote(owner, safe='')}/{quote(name, safe='')}"
    page = _api_page(api_url, mode)
    if not 200 <= page.status < 300:
        return page

    repository = _json_object(page)
    image_data: Mapping[str, object] = {}
    if _github_token():
        image_page = _graphql_page(
            _REPOSITORY_IMAGE_QUERY,
            {"owner": owner, "name": name},
            mode,
        )
        data = _graphql_data(image_page)
        image_data = _as_mapping(data.get("repository")) if data else {}

    return GithubApiPage(
        body=json.dumps(
            {"kind": "repository", "repository": repository, "image": image_data}
        ).encode(),
        status=page.status,
        url=page.url,
        headers={"content-type": "application/json"},
    )


def _payload(page: object, expected_kind: str) -> Mapping[str, object]:
    payload = _json_object(page)
    if payload.get("kind") != expected_kind:
        raise MetadataRequestError(
            "The GitHub API returned an unexpected response.",
            502,
        )
    return payload


def _canonical_url(value: object, fallback: str) -> str:
    url = _as_string(value)
    return url if url.startswith("https://github.com/") else fallback


def extract_profile_metadata(
    page: object,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    payload = _payload(page, "profile")
    profile = _as_mapping(payload.get("profile"))
    login = _as_string(profile.get("login")) or _profile_login(requested_url)
    canonical_url = _canonical_url(
        profile.get("html_url"),
        f"https://github.com/{quote(login, safe='')}",
    )
    image_url = _as_string(profile.get("avatar_url"))
    return {
        "requested_url": requested_url,
        "final_url": canonical_url,
        "provider": provider,
        "http_status": page.status,
        "title": _as_string(profile.get("name")) or login,
        "description": _as_string(profile.get("bio")),
        "image_url": image_url if image_url.startswith("https://") else "",
        "site_name": "GitHub",
        "type": "profile",
        "canonical_url": canonical_url,
        "favicon_url": _FAVICON_URL,
    }


def extract_profile_provider_data(
    page: object,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    payload = _payload(page, "profile")
    profile = _as_mapping(payload.get("profile"))
    login = _as_string(profile.get("login")) or _profile_login(
        metadata["requested_url"]
    )
    profile_type = _as_string(profile.get("type"))
    provider_data: dict[str, object] = {
        "username": login,
        "accountType": profile_type,
    }
    followers = _as_count(profile.get("followers"))
    if followers is not None:
        provider_data["followers"] = followers

    if profile_type == "Organization":
        public_repos = _as_count(profile.get("public_repos"))
        if public_repos is not None:
            provider_data["publicRepos"] = public_repos
        public_members = _as_count(payload.get("publicMembers"))
        if public_members is not None:
            provider_data["publicMembers"] = public_members
    elif profile_type == "User":
        graph = _as_string(payload.get("githubContributionGraph"))
        if graph:
            provider_data["githubContributionGraph"] = graph
    return provider_data


def extract_repository_metadata(
    page: object,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    payload = _payload(page, "repository")
    repository = _as_mapping(payload.get("repository"))
    owner = _as_mapping(repository.get("owner"))
    full_name = _as_string(repository.get("full_name"))
    name = _as_string(repository.get("name"))
    fallback = f"https://github.com/{full_name}" if full_name else requested_url
    canonical_url = _canonical_url(repository.get("html_url"), fallback)
    image_data = _as_mapping(payload.get("image"))
    image_url = _as_string(image_data.get("openGraphImageUrl"))
    if not image_url.startswith("https://"):
        image_url = _as_string(owner.get("avatar_url"))
    return {
        "requested_url": requested_url,
        "final_url": canonical_url,
        "provider": provider,
        "http_status": page.status,
        "title": full_name or name,
        "description": _as_string(repository.get("description")),
        "image_url": image_url if image_url.startswith("https://") else "",
        "site_name": "GitHub",
        "type": "website",
        "canonical_url": canonical_url,
        "favicon_url": _FAVICON_URL,
    }


def extract_repository_provider_data(
    page: object,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    payload = _payload(page, "repository")
    repository = _as_mapping(payload.get("repository"))
    owner = _as_mapping(repository.get("owner"))
    image_data = _as_mapping(payload.get("image"))
    provider_data: dict[str, object] = {}

    owner_name = _as_string(owner.get("login"))
    name = _as_string(repository.get("name"))
    full_name = _as_string(repository.get("full_name"))
    if owner_name:
        provider_data["owner"] = owner_name
    if name:
        provider_data["name"] = name
    if full_name:
        provider_data["fullName"] = full_name

    for source_key, output_key in (
        ("stargazers_count", "starCount"),
        ("forks_count", "forkCount"),
    ):
        count = _as_count(repository.get(source_key))
        if count is not None:
            provider_data[output_key] = count

    pushed_at = _as_string(repository.get("pushed_at"))
    if pushed_at:
        provider_data["pushedAt"] = pushed_at

    if isinstance(image_data.get("usesCustomOpenGraphImage"), bool):
        provider_data["usesCustomOpenGraphImage"] = image_data[
            "usesCustomOpenGraphImage"
        ]
    return provider_data
