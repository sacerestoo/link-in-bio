import json
import re
from collections.abc import Mapping
from urllib.parse import quote, urlencode, urlsplit

from contracts.errors import MetadataRequestError
from contracts.response import ExtractedMetadata
from sources.fetcher import FetchMode, fetch_page

_API_BASE_URL = "https://discord.com/api/v10/invites"
_INVITE_CODE = re.compile(r"[A-Za-z0-9_-]{1,64}")
_DISCORD_FAVICON_URL = "https://discord.com/assets/favicon.ico"


def _invite_code(url: str) -> str:
    parsed = urlsplit(url)
    segments = [segment for segment in parsed.path.split("/") if segment]

    if parsed.hostname in {"discord.gg", "www.discord.gg"} and len(segments) == 1:
        code = segments[0]
    elif len(segments) == 2 and segments[0] == "invite":
        code = segments[1]
    else:
        code = ""

    if _INVITE_CODE.fullmatch(code) is None:
        raise MetadataRequestError("The Discord invite URL is invalid.")
    return code


def fetch_invite(url: str, mode: FetchMode, headers: Mapping[str, str] | None = None):
    code = _invite_code(url)
    query = urlencode({"with_counts": "true"})
    api_url = f"{_API_BASE_URL}/{quote(code, safe='')}?{query}"
    return fetch_page(api_url, mode, headers={"Accept": "application/json"})


def _payload(page: object) -> dict[str, object]:
    body = getattr(page, "body", b"") or b""
    try:
        payload = json.loads(body)
    except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
        raise MetadataRequestError(
            "The Discord API returned invalid JSON.", 502
        ) from None

    if not isinstance(payload, dict):
        raise MetadataRequestError("The Discord API returned an invalid response.", 502)
    return payload


def _as_mapping(value: object) -> Mapping[str, object]:
    return value if isinstance(value, Mapping) else {}


def _as_string(value: object) -> str:
    return value if isinstance(value, str) else ""


def _as_count(value: object) -> int | None:
    if isinstance(value, int) and not isinstance(value, bool) and value >= 0:
        return value
    return None


def _asset_url(asset_type: str, guild_id: str, asset_hash: str) -> str:
    if not guild_id or not asset_hash:
        return ""
    extension = "gif" if asset_hash.startswith("a_") else "png"
    return (
        f"https://cdn.discordapp.com/{asset_type}/{guild_id}/"
        f"{asset_hash}.{extension}?size=1024"
    )


def _invite_matches_request(payload: Mapping[str, object], requested_url: str) -> str:
    requested_code = _invite_code(requested_url)
    if payload.get("code") != requested_code:
        raise MetadataRequestError(
            "The Discord API returned a different invite.",
            502,
        )
    return requested_code


def extract_metadata(
    page: object,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    payload = _payload(page)
    invite_code = _invite_matches_request(payload, requested_url)
    guild = _as_mapping(payload.get("guild"))
    channel = _as_mapping(payload.get("channel"))
    profile = _as_mapping(payload.get("profile"))

    guild_id = _as_string(guild.get("id")) or _as_string(payload.get("guild_id"))
    title = (
        _as_string(guild.get("name"))
        or _as_string(channel.get("name"))
        or "Discord Invite"
    )
    description = _as_string(guild.get("description")) or _as_string(
        profile.get("description")
    )
    image_url = _asset_url("icons", guild_id, _as_string(guild.get("icon")))
    if not image_url:
        image_url = _asset_url("banners", guild_id, _as_string(guild.get("banner")))

    canonical_url = f"https://discord.gg/{quote(invite_code, safe='')}"
    return {
        "requested_url": requested_url,
        "final_url": canonical_url,
        "provider": provider,
        "http_status": page.status,
        "title": title,
        "description": description,
        "image_url": image_url,
        "site_name": "Discord",
        "type": "website",
        "canonical_url": canonical_url,
        "favicon_url": _DISCORD_FAVICON_URL,
    }


def extract_provider_data(
    page: object,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    payload = _payload(page)
    invite_code = _invite_matches_request(payload, metadata["requested_url"])
    guild = _as_mapping(payload.get("guild"))
    guild_id = _as_string(guild.get("id")) or _as_string(payload.get("guild_id"))

    provider_data: dict[str, object] = {
        "invite_code": invite_code,
        "invite_url": metadata["canonical_url"],
    }

    guild_name = _as_string(guild.get("name"))
    if guild_name:
        provider_data["guild_name"] = guild_name

    guild_description = _as_string(guild.get("description"))
    if guild_description:
        provider_data["guild_description"] = guild_description

    guild_icon_url = _asset_url("icons", guild_id, _as_string(guild.get("icon")))
    if guild_icon_url:
        provider_data["guild_icon_url"] = guild_icon_url

    guild_banner_url = _asset_url("banners", guild_id, _as_string(guild.get("banner")))
    if guild_banner_url:
        provider_data["guild_banner_url"] = guild_banner_url

    for field in ("approximate_member_count", "approximate_presence_count"):
        count = _as_count(payload.get(field))
        if count is not None:
            provider_data[field] = count

    if "expires_at" in payload:
        expires_at = payload["expires_at"]
        provider_data["expires_at"] = (
            expires_at if isinstance(expires_at, str) else None
        )

    return provider_data
