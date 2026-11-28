import json
import math
import re
from collections.abc import Mapping
from decimal import Decimal, InvalidOperation
from fractions import Fraction
from urllib.parse import urlencode, urlsplit

from contracts.errors import MetadataRequestError
from contracts.response import ExtractedMetadata
from sources.fetcher import FetchMode, fetch_page

_SYNDICATION_URL = "https://cdn.syndication.twimg.com/tweet-result"
_FEATURES = ";".join(
    (
        "tfw_timeline_list:",
        "tfw_follower_count_sunset:true",
        "tfw_tweet_edit_backend:on",
        "tfw_refsrc_session:on",
        "tfw_fosnr_soft_interventions_enabled:on",
        "tfw_show_birdwatch_pivots_enabled:on",
        "tfw_show_business_verified_badge:on",
        "tfw_duplicate_scribes_to_settings:on",
        "tfw_use_profile_image_shape_enabled:on",
        "tfw_show_blue_verified_badge:on",
        "tfw_legacy_timeline_sunset:true",
        "tfw_show_gov_verified_badge:on",
        "tfw_show_business_affiliate_badge:on",
        "tfw_tweet_edit_frontend:on",
    )
)
_BASE36_DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz"
_TWEET_ID = re.compile(r"\d{1,40}")
_HANDLE = re.compile(r"[A-Za-z0-9_]{1,15}")
_X_FAVICON = "https://abs.twimg.com/favicons/twitter.3.ico"


def _tweet_id_from_url(url: str) -> str:
    segments = urlsplit(url).path.strip("/").split("/")
    try:
        status_index = segments.index("status")
    except ValueError:
        raise MetadataRequestError("The X post URL is invalid.") from None

    tweet_id = segments[status_index + 1] if status_index + 1 < len(segments) else ""
    if _TWEET_ID.fullmatch(tweet_id) is None:
        raise MetadataRequestError("The X post URL is invalid.")
    return tweet_id


def _base36_integer(value: int) -> str:
    if value == 0:
        return "0"

    digits = ""
    while value:
        value, remainder = divmod(value, 36)
        digits = _BASE36_DIGITS[remainder] + digits
    return digits


def _number_to_base36(value: float) -> str:
    integer = math.floor(value)
    fraction = Fraction.from_float(value) - integer
    if not fraction:
        return _base36_integer(integer)

    for precision in range(1, 32):
        scale = 36**precision
        quotient, remainder = divmod(fraction.numerator * scale, fraction.denominator)
        if remainder * 2 >= fraction.denominator:
            quotient += 1
        if quotient == scale:
            candidate_integer = integer + 1
            quotient = 0
        else:
            candidate_integer = integer

        candidate = float(Fraction(candidate_integer * scale + quotient, scale))
        if candidate == value:
            fractional_digits = (
                _base36_integer(quotient).rjust(precision, "0").rstrip("0")
            )
            if not fractional_digits:
                return _base36_integer(candidate_integer)
            return f"{_base36_integer(candidate_integer)}.{fractional_digits}"

    raise RuntimeError("Could not encode the X Syndication API token.")


def _syndication_token(tweet_id: str) -> str:
    value = (float(tweet_id) / 1e15) * math.pi
    return _number_to_base36(value).replace("0", "").replace(".", "")


def _fetch_tweet(url: str, mode: FetchMode, headers: Mapping[str, str] | None = None):
    tweet_id = _tweet_id_from_url(url)
    query = urlencode(
        {
            "id": tweet_id,
            "lang": "en",
            "features": _FEATURES,
            "token": _syndication_token(tweet_id),
        }
    )
    return fetch_page(f"{_SYNDICATION_URL}?{query}", mode, headers=headers)


def _tweet_payload(page, requested_url: str) -> dict[str, object]:
    try:
        payload = json.loads(page.body or b"")
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise MetadataRequestError(
            "The X Syndication API returned invalid JSON.",
            502,
        ) from None

    if not isinstance(payload, dict):
        raise MetadataRequestError(
            "The X Syndication API returned an invalid response.",
            502,
        )
    if payload.get("__typename") == "TweetTombstone" or not payload:
        raise MetadataRequestError("The X post is unavailable.", 404)

    tweet_id = _tweet_id_from_url(requested_url)
    if payload.get("id_str") != tweet_id:
        raise MetadataRequestError(
            "The X Syndication API returned a different post.",
            502,
        )
    if not isinstance(payload.get("text"), str) or not isinstance(
        payload.get("user"), dict
    ):
        raise MetadataRequestError(
            "The X Syndication API returned an incomplete post.",
            502,
        )
    return payload


def _as_string(value: object) -> str:
    return value if isinstance(value, str) else ""


def _safe_handle(value: object) -> str:
    handle = _as_string(value).lstrip("@")
    return handle if _HANDLE.fullmatch(handle) else ""


def _tweet_image(payload: dict[str, object]) -> str:
    media_details = payload.get("mediaDetails")
    if isinstance(media_details, list):
        for media in media_details:
            if isinstance(media, dict) and isinstance(
                media.get("media_url_https"), str
            ):
                return media["media_url_https"]
    return ""


def _extract_metadata(
    page,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    payload = _tweet_payload(page, requested_url)
    user = payload["user"]
    screen_name = _safe_handle(user.get("screen_name"))
    tweet_id = payload["id_str"]
    canonical_url = (
        f"https://x.com/{screen_name}/status/{tweet_id}"
        if screen_name
        else f"https://x.com/i/status/{tweet_id}"
    )
    name = _as_string(user.get("name"))
    title = f"{name} (@{screen_name}) on X" if name and screen_name else "X post"
    text = _as_string(payload.get("text"))

    return {
        "requested_url": requested_url,
        "final_url": canonical_url,
        "provider": provider,
        "http_status": page.status,
        "title": title,
        "description": text[:2000],
        "image_url": _tweet_image(payload),
        "site_name": "X (formerly Twitter)",
        "type": "article",
        "canonical_url": canonical_url,
        "favicon_url": _X_FAVICON,
    }


def _tweet_entities(payload: dict[str, object]) -> dict[str, list[dict[str, object]]]:
    source = payload.get("entities")
    source = source if isinstance(source, dict) else {}
    fields_by_type = {
        "hashtags": ("indices", "text"),
        "urls": ("indices", "expanded_url", "display_url"),
        "user_mentions": ("indices", "screen_name"),
        "symbols": ("indices", "text"),
        "media": ("indices", "expanded_url", "display_url"),
    }
    entities: dict[str, list[dict[str, object]]] = {}
    for entity_type, fields in fields_by_type.items():
        values = source.get(entity_type)
        entities[entity_type] = (
            [
                {field: item[field] for field in fields if field in item}
                for item in values
                if isinstance(item, dict)
            ]
            if isinstance(values, list)
            else []
        )
    return entities


def _tweet_user(value: object) -> dict[str, object]:
    if not isinstance(value, dict):
        return {}

    user = {
        key: value[key]
        for key in (
            "id_str",
            "name",
            "profile_image_url_https",
            "profile_image_shape",
            "screen_name",
            "verified",
            "verified_type",
            "is_blue_verified",
        )
        if key in value
    }
    label = value.get("highlighted_label")
    if isinstance(label, dict):
        badge = label.get("badge")
        if isinstance(badge, dict) and isinstance(badge.get("url"), str):
            user["highlighted_label"] = {
                "description": _as_string(label.get("description")),
                "badge": {"url": badge["url"]},
            }
    return user


def _tweet_media_details(value: object) -> list[dict[str, object]]:
    if not isinstance(value, list):
        return []

    media_details = []
    for item in value:
        if not isinstance(item, dict):
            continue
        media = {
            key: item[key]
            for key in ("media_url_https", "type", "ext_alt_text")
            if isinstance(item.get(key), str)
        }
        original_info = item.get("original_info")
        if isinstance(original_info, dict):
            media["original_info"] = {
                key: original_info[key]
                for key in ("width", "height")
                if isinstance(original_info.get(key), (int, float))
            }

        video_info = item.get("video_info")
        if isinstance(video_info, dict):
            variants = video_info.get("variants")
            media["video_info"] = {
                "variants": [
                    {
                        key: variant[key]
                        for key in ("url", "content_type", "bitrate")
                        if key in variant
                    }
                    for variant in variants
                    if isinstance(variant, dict)
                    and isinstance(variant.get("url"), str)
                    and isinstance(variant.get("content_type"), str)
                ]
                if isinstance(variants, list)
                else []
            }
        media_details.append(media)
    return media_details


def _quoted_tweet(value: object) -> dict[str, object] | None:
    if not isinstance(value, dict):
        return None
    return {
        "id_str": _as_string(value.get("id_str")),
        "text": _as_string(value.get("text")),
        "lang": _as_string(value.get("lang")),
        "display_text_range": value.get("display_text_range", []),
        "entities": _tweet_entities(value),
        "user": _tweet_user(value.get("user")),
        "mediaDetails": _tweet_media_details(value.get("mediaDetails")),
    }


def _extract_provider_data(page, metadata: ExtractedMetadata) -> dict[str, object]:
    payload = _tweet_payload(page, metadata["requested_url"])
    provider_data: dict[str, object] = {
        "id_str": payload["id_str"],
        "text": payload["text"],
        "created_at": _as_string(payload.get("created_at")),
        "lang": _as_string(payload.get("lang")),
        "display_text_range": payload.get("display_text_range", []),
        "user": _tweet_user(payload.get("user")),
        "entities": _tweet_entities(payload),
        "mediaDetails": _tweet_media_details(payload.get("mediaDetails")),
    }

    for field in ("favorite_count", "conversation_count"):
        value = payload.get(field)
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            provider_data[field] = value
    for field in ("in_reply_to_screen_name", "in_reply_to_status_id_str"):
        value = payload.get(field)
        if isinstance(value, str):
            provider_data[field] = value

    note_tweet = payload.get("note_tweet")
    if isinstance(note_tweet, dict) and isinstance(note_tweet.get("id"), str):
        provider_data["note_tweet"] = {"id": note_tweet["id"]}

    quoted_tweet = _quoted_tweet(payload.get("quoted_tweet"))
    if quoted_tweet is not None:
        provider_data["quoted_tweet"] = quoted_tweet
    return provider_data


_FOLLOWER_LABEL = re.compile(r"([\d.,]+\s*[KMB]?)\s+followers\b", re.IGNORECASE)
_RAW_FOLLOWER_COUNT = re.compile(
    r"(?:^|[^\w])[\"']?followers(?:_count|Count)?[\"']?\s*:\s*(\d+)",
    re.IGNORECASE,
)
_COUNT_MULTIPLIERS = {"K": 1_000, "M": 1_000_000, "B": 1_000_000_000}


def _parse_follower_count(value: str) -> dict[str, object] | None:
    normalized = "".join(value.split())
    match = re.fullmatch(r"([\d.,]+)([KMB])?", normalized, re.IGNORECASE)
    if match is None:
        return None

    try:
        count = Decimal(match.group(1).replace(",", ""))
    except InvalidOperation:
        return None

    suffix = (match.group(2) or "").upper()
    count *= _COUNT_MULTIPLIERS.get(suffix, 1)
    return {
        "follower_count": int(count),
        "follower_count_approximate": bool(suffix),
    }


def _extract_profile_provider_data(
    page: object,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    description = _FOLLOWER_LABEL.search(metadata["description"])
    if description is not None:
        parsed = _parse_follower_count(description.group(1))
        if parsed is not None:
            return parsed

    body = getattr(page, "body", b"") or b""
    html = (
        body.decode("utf-8", errors="replace") if isinstance(body, bytes) else str(body)
    )
    raw_count = _RAW_FOLLOWER_COUNT.search(html)
    return _parse_follower_count(raw_count.group(1)) if raw_count else {}
