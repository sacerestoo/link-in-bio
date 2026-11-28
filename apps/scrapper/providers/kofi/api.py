import re
from decimal import Decimal, InvalidOperation
from typing import Any
from urllib.parse import urlsplit

from contracts.response import ExtractedMetadata
from sources.html_metadata import extract_metadata as extract_html_metadata

_SUPPORTER_COUNT = re.compile(
    r"(?P<count>\d[\d,]*(?:\.\d+)?)\s*(?P<suffix>[KMB])?\s+supporters?\b",
    re.IGNORECASE,
)
_COUNT_MULTIPLIERS = {
    "": Decimal(1),
    "K": Decimal(1_000),
    "M": Decimal(1_000_000),
    "B": Decimal(1_000_000_000),
}


def _clean(value: object, limit: int = 2000) -> str:
    if value is None:
        return ""
    return " ".join(str(value).split())[:limit]


def _texts(page: Any, selector: str) -> list[str]:
    return [
        text
        for element in page.css(selector)
        if (text := _clean(" ".join(element.css("::text").getall())))
    ]


def _text(page: Any, selector: str) -> str:
    values = _texts(page, selector)
    return values[0] if values else ""


def _slug(url: str) -> str:
    return next(
        (segment for segment in urlsplit(url).path.split("/") if segment),
        "",
    )


def _supporter_data(page: Any) -> dict[str, object]:
    for text in _texts(page, ".profile-supporter-count"):
        match = _SUPPORTER_COUNT.search(text)
        if match is None:
            continue

        count_text = match.group("count")
        suffix = (match.group("suffix") or "").upper()
        try:
            count = int(
                Decimal(count_text.replace(",", "")) * _COUNT_MULTIPLIERS[suffix]
            )
        except (InvalidOperation, ValueError):
            continue

        return {
            "supporter_count": count,
            "supporter_count_approximate": bool(suffix or "." in count_text),
            "supporter_count_text": text,
        }

    return {}


def _profile_image(page: Any) -> str:
    images = page.css("img.panel-profile-image-sm")
    if not images:
        return ""
    return _clean(images[0].attrib.get("src", ""), 2000)


def _creator_data(page: Any, metadata: ExtractedMetadata) -> dict[str, object]:
    creator_slug = _slug(metadata["canonical_url"] or metadata["final_url"])
    if not creator_slug:
        creator_slug = _slug(metadata["requested_url"])

    display_name = _text(page, "#displayName") or metadata["title"]
    bio = _text(page, ".profile-page-tile p.kfds-c-para-control")
    profile_image = _profile_image(page) or metadata["image_url"]
    return {
        "creator_handle": creator_slug,
        "display_name": display_name,
        "bio": bio,
        "profile_image_url": profile_image,
        "support_url": metadata["canonical_url"] or metadata["final_url"],
        **_supporter_data(page),
    }


def extract_creator_metadata(
    page: Any,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    metadata = extract_html_metadata(page, requested_url, final_url, provider)
    creator_data = _creator_data(page, metadata)
    bio = str(creator_data["bio"])

    if bio:
        metadata["description"] = bio
    metadata["title"] = metadata["title"] or str(creator_data["display_name"])
    metadata["site_name"] = "Ko-fi"
    metadata["type"] = "profile"
    return metadata


def extract_creator_provider_data(
    page: Any,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    return _creator_data(page, metadata)
