import json
import os
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any
from urllib.parse import unquote, urljoin, urlsplit

from scrapling.fetchers import Fetcher, FetcherSession

from contracts.errors import MetadataRequestError
from contracts.response import ExtractedMetadata
from sources.fetcher import FETCH_OPTIONS, FetchMode

_API_URL = "https://api.producthunt.com/v2/api/graphql"
_FAVICON_URL = "https://www.producthunt.com/favicon.ico"
_PRODUCT_QUERY = """
query ProductHuntProduct($slug: String!) {
  post(slug: $slug) {
    id
    name
    slug
    tagline
    description
    createdAt
    url
    website
    votesCount
    commentsCount
    reviewsCount
    reviewsRating
    thumbnail {
      type
      url
    }
    makers {
      name
      username
      url
      profileImage
    }
  }
}
"""
_MAKER_QUERY = """
query ProductHuntMaker($username: String!) {
  user(username: $username) {
    id
    name
    username
    headline
    url
    websiteUrl
    twitterUsername
    followersCount
    followingCount
    isMaker
    profileImage
    madePosts(first: 10) {
      edges {
        node {
          makers {
            username
            profileImage
          }
        }
      }
    }
  }
}
"""


@dataclass(frozen=True, slots=True)
class ProductHuntApiPage:
    body: bytes
    status: int
    url: str
    headers: Mapping[str, str]
    target_type: str
    identifier: str
    record: Mapping[str, object] | None


def _path_segments(url: str) -> list[str]:
    return [unquote(segment) for segment in urlsplit(url).path.split("/") if segment]


def _target_identifier(url: str, target_type: str) -> str:
    segments = _path_segments(url)
    if target_type == "product" and len(segments) >= 2:
        if segments[0] in ("products", "posts"):
            return segments[1]
    if target_type == "maker" and len(segments) == 1:
        username = segments[0].removeprefix("@")
        if username:
            return username
    raise MetadataRequestError(f"The Product Hunt {target_type} URL is invalid.")


def _api_page(query: str, variables: Mapping[str, str], mode: FetchMode):
    token = os.environ.get("PRODUCT_HUNT_TOKEN", "").strip()
    if not token:
        raise MetadataRequestError("PRODUCT_HUNT_TOKEN is not configured.", 503)

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    body = {"query": query, "variables": dict(variables)}
    if mode == "session":
        with FetcherSession(**FETCH_OPTIONS) as session:
            return session.post(
                _API_URL,
                headers={**FETCH_OPTIONS["headers"], **headers},
                json=body,
                stealthy_headers=False,
            )

    return Fetcher.post(
        _API_URL,
        **{
            **FETCH_OPTIONS,
            "headers": {**FETCH_OPTIONS["headers"], **headers},
            "json": body,
            "stealthy_headers": False,
        },
    )


def _record_from_page(page: Any, target_type: str) -> Mapping[str, object] | None:
    if not 200 <= page.status < 300:
        return None

    try:
        payload = json.loads(page.body or b"")
    except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
        raise MetadataRequestError("Product Hunt returned invalid JSON.", 502) from None
    if not isinstance(payload, dict):
        raise MetadataRequestError("Product Hunt returned an invalid response.", 502)

    errors = payload.get("errors")
    if isinstance(errors, list) and errors:
        raise MetadataRequestError("Product Hunt GraphQL request failed.", 502)

    data = payload.get("data")
    key = "post" if target_type == "product" else "user"
    record = data.get(key) if isinstance(data, dict) else None
    if not isinstance(record, dict):
        raise MetadataRequestError(f"Product Hunt {target_type} was not found.", 404)
    return record


def _as_mapping(value: object) -> Mapping[str, object]:
    return value if isinstance(value, Mapping) else {}


def _as_string(value: object) -> str:
    return value if isinstance(value, str) else ""


def _maker_profile_image(record: Mapping[str, object], username: str) -> str:
    profile_image = _as_string(record.get("profileImage"))
    if profile_image:
        return profile_image

    connection = _as_mapping(record.get("madePosts"))
    edges = connection.get("edges")
    if not isinstance(edges, list):
        return ""

    for edge in edges:
        node = _as_mapping(_as_mapping(edge).get("node"))
        makers = node.get("makers")
        if not isinstance(makers, list):
            continue
        for maker in makers:
            maker_data = _as_mapping(maker)
            if _as_string(maker_data.get("username")).casefold() != username.casefold():
                continue
            profile_image = _as_string(maker_data.get("profileImage"))
            if profile_image:
                return profile_image
    return ""


def _extract_metadata(
    page: ProductHuntApiPage,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    record = page.record or {}
    canonical_url = _as_string(record.get("url")) or requested_url

    if page.target_type == "product":
        thumbnail = _as_mapping(record.get("thumbnail"))
        title = _as_string(record.get("name"))
        description = _as_string(record.get("tagline")) or _as_string(
            record.get("description")
        )
        image = _as_string(thumbnail.get("url"))
        page_type = "product"
    else:
        title = _as_string(record.get("name"))
        description = _as_string(record.get("headline"))
        image = _maker_profile_image(record, page.identifier)
        page_type = "profile"

    return {
        "requested_url": requested_url,
        "final_url": canonical_url or final_url,
        "provider": provider,
        "http_status": page.status,
        "title": title,
        "description": description,
        "image_url": urljoin(canonical_url, image) if image else "",
        "site_name": "Product Hunt",
        "type": page_type,
        "canonical_url": canonical_url,
        "favicon_url": _FAVICON_URL,
    }


def _fetch_target(url: str, mode: FetchMode, target_type: str) -> ProductHuntApiPage:
    query = _PRODUCT_QUERY if target_type == "product" else _MAKER_QUERY
    query_variable = "slug" if target_type == "product" else "username"
    identifier = _target_identifier(url, target_type)
    response = _api_page(query, {query_variable: identifier}, mode)
    record = _record_from_page(response, target_type)
    return ProductHuntApiPage(
        body=response.body or b"",
        status=response.status,
        url=url,
        headers={"content-type": "application/json"},
        target_type=target_type,
        identifier=identifier,
        record=record,
    )


def fetch_product(url: str, mode: FetchMode, headers=None) -> ProductHuntApiPage:
    return _fetch_target(url, mode, "product")


def fetch_maker(url: str, mode: FetchMode, headers=None) -> ProductHuntApiPage:
    return _fetch_target(url, mode, "maker")


def extract_product_provider_data(
    page: ProductHuntApiPage,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    return dict(page.record or {})


def extract_maker_provider_data(
    page: ProductHuntApiPage,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    provider_data = dict(page.record or {})
    provider_data["username"] = page.identifier
    provider_data["profileImage"] = _maker_profile_image(
        page.record or {},
        page.identifier,
    ) or provider_data.get("profileImage")
    provider_data.pop("madePosts", None)
    return provider_data
