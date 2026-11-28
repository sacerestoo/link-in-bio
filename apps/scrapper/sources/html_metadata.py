from urllib.parse import urljoin, urlsplit

from contracts.response import ExtractedMetadata
from contracts.settings import ADAPTIVE_SELECTORS_ENABLED


def _adaptive_css(page, selector: str, identifier: str):
    return page.css(
        selector,
        identifier=f"shared-metadata:{identifier}",
        adaptive=ADAPTIVE_SELECTORS_ENABLED,
        auto_save=ADAPTIVE_SELECTORS_ENABLED,
    )


def _clean(value: object, limit: int = 2000) -> str:
    if value is None:
        return ""
    return " ".join(str(value).split())[:limit]


def _first(values: dict[str, str], *keys: str) -> str:
    for key in keys:
        value = values.get(key)
        if value:
            return value
    return ""


def extract_metadata(
    page,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    meta_values: dict[str, str] = {}

    for element in _adaptive_css(page, "meta", "meta-tags"):
        attrs = element.attrib
        key = (
            attrs.get("property")
            or attrs.get("name")
            or attrs.get("itemprop")
            or attrs.get("http-equiv")
            or ""
        ).strip()
        content = _clean(attrs.get("content", ""))
        if key and content:
            meta_values.setdefault(key.casefold(), content)

    title_text = _clean(
        " ".join(_adaptive_css(page, "title::text", "title").getall()),
        500,
    )
    title = _first(meta_values, "og:title", "twitter:title", "title") or title_text
    description = _first(
        meta_values,
        "description",
        "og:description",
        "twitter:description",
    )
    image = _first(
        meta_values,
        "og:image",
        "og:image:url",
        "twitter:image",
        "twitter:image:src",
    )

    canonical = ""
    favicon = ""
    for element in _adaptive_css(page, "link", "link-tags"):
        attrs = element.attrib
        rel = set(attrs.get("rel", "").casefold().split())
        href = attrs.get("href", "").strip()
        if not href:
            continue
        if not canonical and "canonical" in rel:
            canonical = href
        if not favicon and ("icon" in rel or "shortcut" in rel):
            favicon = href

    host = urlsplit(final_url).hostname or ""
    return {
        "requested_url": requested_url,
        "final_url": final_url,
        "provider": provider,
        "http_status": page.status,
        "title": title[:500],
        "description": description[:2000],
        "image_url": urljoin(final_url, image) if image else "",
        "site_name": _first(meta_values, "og:site_name", "application-name") or host,
        "type": _first(meta_values, "og:type"),
        "canonical_url": urljoin(final_url, canonical) if canonical else "",
        "favicon_url": urljoin(final_url, favicon) if favicon else "",
    }
