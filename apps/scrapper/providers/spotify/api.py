import base64
import binascii
import json
import logging
import re
from collections.abc import Mapping
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from urllib.parse import parse_qs, quote, unquote, urljoin, urlsplit

from contracts.errors import MetadataRequestError
from contracts.response import ExtractedMetadata
from contracts.settings import MAX_HTML_BYTES
from contracts.source import MetadataSource
from sources.fetcher import FetchMode, fetch_page
from sources.html_metadata import extract_metadata

LOGGER = logging.getLogger(__name__)

_RESOURCE_TYPES = {"album", "artist", "episode", "playlist", "show", "track"}
_SUPPORTED_DATA_TYPES = {"album", "artist", "episode", "playlist", "show", "track"}
_SPOTIFY_FAVICON_URL = "https://open.spotifycdn.com/cdn/images/favicon32.b64ecc03.png"
_SPOTIFY_SHARE_USER_AGENT = (
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"
)
_SPOTIFY_ARTIST_SHARE_TIMEOUT = 2.5
_MONTHLY_LISTENERS_PATTERN = re.compile(
    r"(?P<count>\d[\d,]*(?:\.\d+)?)\s*(?P<suffix>[KMB])?\s+monthly listeners\b",
    re.IGNORECASE,
)
_COUNT_MULTIPLIERS = {
    "": Decimal(1),
    "K": Decimal(1_000),
    "M": Decimal(1_000_000),
    "B": Decimal(1_000_000_000),
}


@dataclass(frozen=True, slots=True)
class SpotifyEmbedPage:
    body: bytes
    status: int
    url: str
    headers: Mapping[str, str]
    html_page: object
    entity: dict[str, object] | None
    artist_description: str | None = None
    monthly_listeners_count: int | None = None
    monthly_listeners_count_approximate: bool | None = None
    monthly_listeners_text: str | None = None


def _identity_from_uri(uri: object) -> tuple[str, str] | None:
    if not isinstance(uri, str):
        return None

    parts = uri.split(":")
    if len(parts) >= 5 and parts[0] == "spotify" and parts[1] == "user":
        if parts[3] == "playlist" and parts[4]:
            return "playlist", parts[4]
    if len(parts) >= 3 and parts[0] == "spotify":
        if parts[1] in _RESOURCE_TYPES and parts[2]:
            return parts[1], parts[2]
    return None


def _identity_from_url(url: str) -> tuple[str, str] | None:
    parsed = urlsplit(url)
    uri = parse_qs(parsed.query).get("uri", [""])[0]
    identity = _identity_from_uri(uri)
    if identity is not None:
        return identity

    path_parts = [
        unquote(part)
        for part in parsed.path.split("/")
        if part and not part.startswith("intl-")
    ]
    if path_parts and path_parts[0] == "embed":
        path_parts = path_parts[1:]

    if (
        len(path_parts) >= 4
        and path_parts[0] == "user"
        and path_parts[2] == "playlist"
        and path_parts[3]
    ):
        return "playlist", path_parts[3]
    if len(path_parts) >= 2 and path_parts[0] in _RESOURCE_TYPES and path_parts[1]:
        return path_parts[0], path_parts[1]
    return None


def _monthly_listeners_from_description(
    description: str,
) -> tuple[int, bool, str] | None:
    match = _MONTHLY_LISTENERS_PATTERN.search(description)
    if match is None:
        return None

    count_text = match.group("count")
    suffix = (match.group("suffix") or "").upper()
    try:
        count = int(
            (
                Decimal(count_text.replace(",", "")) * _COUNT_MULTIPLIERS[suffix]
            ).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
        )
    except (InvalidOperation, ValueError):
        return None

    return count, bool(suffix or "." in count_text), match.group(0)


def _fetch_artist_share_metadata(
    resource_id: str, mode: FetchMode
) -> tuple[str | None, tuple[int, bool, str] | None]:
    artist_url = f"https://open.spotify.com/artist/{quote(resource_id, safe='')}"
    try:
        artist_page = fetch_page(
            artist_url,
            mode,
            headers={
                "Accept-Language": "en-US,en;q=0.9",
                "User-Agent": _SPOTIFY_SHARE_USER_AGENT,
            },
            stealthy_headers=False,
            timeout=_SPOTIFY_ARTIST_SHARE_TIMEOUT,
        )
    except Exception:
        LOGGER.warning("Spotify artist share metadata could not be fetched.")
        return None, None

    artist_body = artist_page.body or b""
    if not 200 <= artist_page.status < 300 or len(artist_body) > MAX_HTML_BYTES:
        return None, None

    description = (
        artist_page.css('meta[property="og:description"]::attr(content)').get() or ""
    )
    return description or None, _monthly_listeners_from_description(description)


def _script_entity(page: object) -> dict[str, object] | None:
    scripts = page.css("body script")
    for marker in ("resource", "initial-state", "__NEXT_DATA__"):
        script = next(
            (item for item in scripts if marker in item.attrib.values()),
            None,
        )
        if script is None:
            continue

        content = script.css("script::text").get() or ""
        try:
            if marker == "__NEXT_DATA__":
                payload = json.loads(content)
                entity = (
                    payload.get("props", {})
                    .get("pageProps", {})
                    .get("state", {})
                    .get("data", {})
                    .get("entity")
                )
            else:
                payload = json.loads(base64.b64decode(content).decode("utf-8"))
                entity = (
                    payload
                    if marker == "resource"
                    else payload.get("data", {}).get("entity")
                )
        except (
            AttributeError,
            binascii.Error,
            json.JSONDecodeError,
            TypeError,
            UnicodeDecodeError,
        ):
            continue

        if isinstance(entity, dict):
            return entity
    return None


def fetch_spotify_page(
    url: str,
    mode: FetchMode,
    headers: Mapping[str, str] | None = None,
) -> SpotifyEmbedPage:
    identity = _identity_from_url(url)
    if identity is None:
        raise MetadataRequestError("The Spotify URL is invalid.")

    resource_type, resource_id = identity
    spotify_uri = f"spotify:{resource_type}:{resource_id}"
    embed_url = f"https://embed.spotify.com/?uri={spotify_uri}"
    artist_description = None
    monthly_listeners = None
    if resource_type == "artist":
        with ThreadPoolExecutor(max_workers=2) as executor:
            embed_future = executor.submit(fetch_page, embed_url, mode, headers)
            artist_future = executor.submit(
                _fetch_artist_share_metadata, resource_id, mode
            )
            page = embed_future.result()
            artist_description, monthly_listeners = artist_future.result()
    else:
        page = fetch_page(embed_url, mode, headers)

    body = page.body or b""
    entity = None
    if 200 <= page.status < 300 and len(body) <= MAX_HTML_BYTES:
        entity = _script_entity(page)

    return SpotifyEmbedPage(
        body=body,
        status=page.status,
        url=page.url,
        headers=page.headers,
        html_page=page,
        entity=entity,
        artist_description=artist_description or None,
        monthly_listeners_count=monthly_listeners[0] if monthly_listeners else None,
        monthly_listeners_count_approximate=(
            monthly_listeners[1] if monthly_listeners else None
        ),
        monthly_listeners_text=monthly_listeners[2] if monthly_listeners else None,
    )


def _mapping(value: object) -> Mapping[str, object]:
    return value if isinstance(value, Mapping) else {}


def _normalized_entity(page: object) -> dict[str, object]:
    if not isinstance(page, SpotifyEmbedPage) or page.entity is None:
        raise MetadataRequestError("Spotify embed data could not be read.", 502)

    data = dict(page.entity)
    name = data.get("name")
    identity = _identity_from_uri(data.get("uri"))
    if (
        not isinstance(name, str)
        or not name
        or data.get("type") not in _SUPPORTED_DATA_TYPES
        or identity is None
    ):
        raise MetadataRequestError("Spotify embed data was invalid.", 502)

    data["type"] = identity[0]
    data.setdefault("id", identity[1])
    return data


def _track_artist(track: Mapping[str, object]) -> str | None:
    show = _mapping(track.get("show"))
    if show:
        publisher = show.get("publisher")
        if isinstance(publisher, str) and publisher:
            return publisher

    artists = track.get("artists")
    names = (
        [
            artist["name"]
            for artist in artists
            if isinstance(artists, list)
            and isinstance(artist, Mapping)
            and isinstance(artist.get("name"), str)
            and artist["name"]
        ]
        if isinstance(artists, list)
        else []
    )
    if len(names) == 1:
        return names[0]
    if len(names) == 2:
        return f"{names[0]} & {names[1]}"
    if names:
        return f"{', '.join(names[:-1])} & {names[-1]}"

    subtitle = track.get("subtitle")
    return subtitle if isinstance(subtitle, str) and subtitle else None


def _to_track(track: Mapping[str, object]) -> dict[str, object]:
    audio_preview = _mapping(track.get("audioPreview"))
    preview_url = audio_preview.get("url") if track.get("isPlayable") is True else None
    values = {
        "artist": _track_artist(track),
        "duration": track.get("duration"),
        "name": track.get("title") or track.get("name"),
        "preview_url": preview_url,
        "uri": track.get("uri"),
    }
    return {key: value for key, value in values.items() if value is not None}


def _get_tracks(data: Mapping[str, object]) -> list[dict[str, object]]:
    track_list = data.get("trackList")
    items = track_list[:100] if isinstance(track_list, list) else [data]
    return [_to_track(item) for item in items if isinstance(item, Mapping)]


def _get_images(data: Mapping[str, object]) -> list[Mapping[str, object]]:
    cover_art = _mapping(data.get("coverArt"))
    visual_identity = _mapping(data.get("visualIdentity"))
    candidates = cover_art.get("sources") or data.get("images")
    if not isinstance(candidates, list):
        candidates = visual_identity.get("image")
    if not isinstance(candidates, list):
        return []
    return [item for item in candidates if isinstance(item, Mapping)]


def _largest_image_url(data: Mapping[str, object]) -> str | None:
    images = _get_images(data)
    image = max(
        images,
        key=lambda item: (
            item.get("width")
            if isinstance(item.get("width"), int)
            and not isinstance(item.get("width"), bool)
            else 0
        ),
        default=None,
    )
    url = image.get("url") if image is not None else None
    return url if isinstance(url, str) and url else None


def _release_date(data: Mapping[str, object]) -> str | None:
    release_date = _mapping(data.get("releaseDate")).get("isoString")
    if not isinstance(release_date, str) or not release_date:
        release_date = data.get("release_date")
    if not isinstance(release_date, str) or not release_date:
        return None

    try:
        parsed = datetime.fromisoformat(release_date.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return (
        parsed.astimezone(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    )


def _spotify_link(data: Mapping[str, object]) -> tuple[str, str]:
    identity = _identity_from_uri(data.get("uri"))
    if identity is None:
        raise MetadataRequestError("Spotify embed data did not include a URI.", 502)
    resource_type, resource_id = identity
    encoded_id = quote(resource_id, safe="")
    return (
        f"https://open.spotify.com/{resource_type}/{encoded_id}",
        f"https://embed.spotify.com/?uri=spotify:{resource_type}:{resource_id}",
    )


def _preview(
    data: Mapping[str, object], tracks: list[dict[str, object]]
) -> dict[str, object]:
    if not tracks:
        raise MetadataRequestError("Spotify embed data did not include tracks.", 502)

    track = tracks[0]
    image_url = _largest_image_url(data)
    link, embed = _spotify_link(data)
    description = (
        data.get("description") or data.get("subtitle") or track.get("description")
    )
    values = {
        "date": _release_date(data),
        "title": data.get("name"),
        "type": data.get("type"),
        "track": track.get("name"),
        "description": description,
        "artist": track.get("artist"),
        "image": image_url,
        "audio": track.get("preview_url"),
        "link": link,
        "embed": embed,
    }
    return {key: value for key, value in values.items() if value is not None}


def _spotify_details(
    page: object,
) -> tuple[dict[str, object], list[dict[str, object]], dict[str, object]]:
    data = _normalized_entity(page)
    tracks = _get_tracks(data)
    preview = _preview(data, tracks)
    return data, tracks, preview


def extract_spotify_metadata(
    page: SpotifyEmbedPage,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    data, _, preview = _spotify_details(page)
    metadata = extract_metadata(
        page.html_page,
        requested_url,
        final_url,
        provider,
    )
    description = page.artist_description or preview.get("description") or ""
    image_url = preview.get("image")
    return {
        **metadata,
        "title": str(data["name"])[:500],
        "description": str(description)[:2000],
        "image_url": urljoin(final_url, image_url)
        if isinstance(image_url, str)
        else "",
        "site_name": "Spotify",
        "type": str(data["type"]),
        "canonical_url": str(preview["link"]),
        "favicon_url": metadata["favicon_url"] or _SPOTIFY_FAVICON_URL,
    }


def extract_provider_data(
    page: SpotifyEmbedPage, metadata: ExtractedMetadata
) -> dict[str, object]:
    data, tracks, preview = _spotify_details(page)
    identity = _identity_from_url(metadata["requested_url"])
    if identity is None:
        identity = _identity_from_url(metadata["canonical_url"])
    if identity is None:
        identity = _identity_from_uri(data.get("uri"))
    if identity is None:
        raise MetadataRequestError("The Spotify URL is invalid.")

    resource_type, resource_id = identity
    encoded_id = quote(resource_id, safe="")
    provider_data: dict[str, object] = {
        "resource_type": resource_type,
        "resource_id": resource_id,
        "spotify_uri": f"spotify:{resource_type}:{resource_id}",
        "open_url": f"https://open.spotify.com/{resource_type}/{encoded_id}",
        "embed_url": f"https://embed.spotify.com/?uri=spotify:{resource_type}:{resource_id}",
        "preview": preview,
        "tracks": tracks,
    }
    if resource_type == "artist" and page.monthly_listeners_count is not None:
        provider_data["monthly_listeners_count"] = page.monthly_listeners_count
        provider_data["monthly_listeners_count_approximate"] = bool(
            page.monthly_listeners_count_approximate
        )
        if page.monthly_listeners_text is not None:
            provider_data["monthly_listeners_text"] = page.monthly_listeners_text
    return provider_data


SOURCE = MetadataSource(
    fetch=fetch_spotify_page,
    accepted_content_types=("text/html", "application/xhtml+xml"),
    extract_metadata=extract_spotify_metadata,
    extract_provider_data=extract_provider_data,
)
