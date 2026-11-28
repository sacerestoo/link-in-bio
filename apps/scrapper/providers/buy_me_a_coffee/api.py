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
    for text in _texts(page, "div.text-grey71"):
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


def _profile_image(page: Any, creator_slug: str) -> str:
    for image in page.css("img[alt]"):
        if image.attrib.get("alt", "").strip().casefold() == creator_slug.casefold():
            return _clean(image.attrib.get("src", ""), 2000)
    return ""


def _creator_data(page: Any, metadata: ExtractedMetadata) -> dict[str, object]:
    creator_slug = _slug(metadata["canonical_url"] or metadata["final_url"])
    if not creator_slug:
        creator_slug = _slug(metadata["requested_url"])

    about_headings = _texts(page, 'div[aria-label^="About "] h2')
    tagline = next(
        (
            heading
            for heading in about_headings
            if not heading.casefold().startswith("about ")
        ),
        "",
    )
    bio = _text(page, ".bioSectionWrapper")
    display_name = ""
    if metadata["title"]:
        display_name = re.split(
            r"\s+is\s+(?:creating|making|building)\s+",
            metadata["title"],
            maxsplit=1,
            flags=re.IGNORECASE,
        )[0].strip()
    display_name = display_name or creator_slug

    profile_image = _profile_image(page, creator_slug) or metadata["image_url"]
    return {
        "creator_handle": creator_slug,
        "display_name": display_name,
        "tagline": tagline,
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
    tagline = str(creator_data["tagline"])

    if bio and not re.search(r"\bi just created a page here\b", bio, re.IGNORECASE):
        metadata["description"] = bio
    elif tagline:
        metadata["description"] = tagline
    elif bio:
        metadata["description"] = bio

    metadata["title"] = metadata["title"] or str(creator_data["display_name"])
    metadata["type"] = "profile"
    return metadata


def extract_creator_provider_data(
    page: Any,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    return _creator_data(page, metadata)
