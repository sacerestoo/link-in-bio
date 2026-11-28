import json
import logging
import re
from collections.abc import Mapping
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from html import unescape
from html.parser import HTMLParser
from typing import Any
from urllib.parse import parse_qs, urlencode, urlsplit

from contracts.response import ExtractedMetadata
from contracts.settings import MAX_HTML_BYTES
from sources.fetcher import FetchMode, fetch_page
from sources.html_metadata import extract_metadata

logger = logging.getLogger(__name__)

_SOUNDCLOUD_HOSTS = {"soundcloud.com", "www.soundcloud.com"}
_SOUNDCLOUD_OEMBED_HOSTS = {*_SOUNDCLOUD_HOSTS, "on.soundcloud.com"}
_TARGET_BY_OG_TYPE = {
    "music.album": "playlist",
    "music.musician": "user",
    "music.playlist": "playlist",
    "music.song": "track",
}
_TRACK_FIELDS = (
    "artwork_url",
    "comment_count",
    "created_at",
    "download_count",
    "genre",
    "last_modified",
    "license",
    "likes_count",
    "permalink_url",
    "playback_count",
    "release_date",
    "reposts_count",
    "tag_list",
)
_USER_FIELDS = (
    "city",
    "comments_count",
    "country_code",
    "created_at",
    "followers_count",
    "followings_count",
    "likes_count",
    "playlist_count",
    "track_count",
    "verified",
)
_PLAYLIST_FIELDS = (
    "artwork_url",
    "created_at",
    "genre",
    "is_album",
    "last_modified",
    "likes_count",
    "release_date",
    "reposts_count",
    "sharing",
    "tag_list",
)
_MAX_PLAYLIST_TRACKS = 50


class _PlayerIframeParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.player_url = ""

    def handle_starttag(
        self,
        tag: str,
        attrs: list[tuple[str, str | None]],
    ) -> None:
        if tag.casefold() != "iframe":
            return
        src = next((value for key, value in attrs if key.casefold() == "src"), None)
        if isinstance(src, str) and _is_player_url(src):
            self.player_url = src


@dataclass(frozen=True, slots=True)
class SoundCloudPage:
    html_page: Any
    oembed: dict[str, object]

    @property
    def status(self) -> int:
        return int(self.html_page.status)

    @property
    def body(self) -> bytes:
        body = self.html_page.body
        if isinstance(body, bytes):
            return body
        return str(body or "").encode()

    @property
    def headers(self) -> Mapping[str, str]:
        return self.html_page.headers

    @property
    def url(self) -> str:
        return str(self.html_page.url)


def fetch_soundcloud_page(
    url: str,
    mode: FetchMode,
    headers: Mapping[str, str] | None = None,
) -> SoundCloudPage:
    with ThreadPoolExecutor(max_workers=2) as executor:
        html_future = executor.submit(fetch_page, url, mode, headers=headers)
        oembed_future = executor.submit(_fetch_oembed_url, url, mode)
        html_page = html_future.result()
        oembed = oembed_future.result()

    final_host = (
        urlsplit(str(getattr(html_page, "url", ""))).hostname or ""
    ).casefold()
    if (
        not 200 <= html_page.status < 300
        or len(html_page.body or b"") > MAX_HTML_BYTES
        or final_host not in _SOUNDCLOUD_HOSTS
    ):
        oembed = {}
    return SoundCloudPage(html_page=html_page, oembed=oembed)


def _fetch_oembed_url(url: str, mode: FetchMode) -> dict[str, object]:
    if (urlsplit(url).hostname or "").casefold() not in _SOUNDCLOUD_OEMBED_HOSTS:
        return {}

    endpoint = "https://soundcloud.com/oembed?" + urlencode(
        {"format": "json", "url": url}
    )
    try:
        response = fetch_page(endpoint, mode, headers={"Accept": "application/json"})
        if not 200 <= response.status < 300:
            return {}
        body = response.body or b""
        if len(body) > 100_000:
            return {}
        payload = json.loads(body)
    except Exception as error:
        logger.info("SoundCloud oEmbed lookup failed: %s", error)
        return {}

    return payload if isinstance(payload, dict) else {}


def extract_soundcloud_metadata(
    page: SoundCloudPage,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    metadata = extract_metadata(page.html_page, requested_url, final_url, provider)
    open_graph_description = _open_graph_description(page.html_page)
    description = _plain_text(page.oembed.get("description"))
    if not description:
        description = _plain_text(open_graph_description)
    if description:
        metadata["description"] = description[:2000]

    thumbnail_url = _string(page.oembed.get("thumbnail_url"))
    if thumbnail_url and not metadata["image_url"]:
        metadata["image_url"] = thumbnail_url
    return metadata


def extract_track_provider_data(
    page: SoundCloudPage,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    sound = _hydration_record(page, "sound")
    user = _mapping(sound.get("user"))
    data = _resource_base("track", sound, metadata)
    _copy_fields(data, sound, _TRACK_FIELDS)
    _copy_alias(data, sound, "duration_ms", "full_duration", "duration")
    _copy_description(data, sound, metadata["description"])
    _copy_alias(data, user, "artist_name", "username", "full_name")
    _copy_alias(data, user, "artist_url", "permalink_url")
    _copy_alias(data, user, "artist_avatar_url", "avatar_url")
    publisher_metadata = _mapping(sound.get("publisher_metadata"))
    _copy_alias(data, publisher_metadata, "isrc", "isrc")
    _copy_embed(data, page)
    return data


def extract_user_provider_data(
    page: SoundCloudPage,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    user = _hydration_record(page, "user")
    data = _resource_base("user", user, metadata)
    _copy_fields(data, user, _USER_FIELDS)
    _copy_alias(data, user, "username", "permalink")
    _copy_alias(data, user, "display_name", "username", "full_name")
    _copy_alias(data, user, "full_name", "full_name")
    _copy_alias(data, user, "profile_url", "permalink_url")
    _copy_alias(data, user, "avatar_url", "avatar_url")
    _copy_description(data, user, metadata["description"])
    _copy_embed(data, page)
    return data


def extract_playlist_provider_data(
    page: SoundCloudPage,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    playlist = _hydration_record(page, "playlist")
    owner = _mapping(playlist.get("user"))
    data = _resource_base("playlist", playlist, metadata)
    _copy_fields(data, playlist, _PLAYLIST_FIELDS)
    _copy_alias(data, playlist, "duration_ms", "duration")
    _copy_description(data, playlist, metadata["description"])
    _copy_alias(data, owner, "owner_name", "username", "full_name")
    _copy_alias(data, owner, "owner_url", "permalink_url")
    _copy_alias(data, owner, "owner_avatar_url", "avatar_url")
    _copy_embed(data, page)

    tracks = playlist.get("tracks")
    track_count = playlist.get("track_count")
    if isinstance(track_count, int):
        data["track_count"] = track_count
    if isinstance(tracks, list):
        data["tracks"] = [
            _track_summary(track)
            for track in tracks[:_MAX_PLAYLIST_TRACKS]
            if isinstance(track, dict)
        ]
        data.setdefault("track_count", len(tracks))
    return data


def extract_short_link_provider_data(
    page: SoundCloudPage,
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    target_type = soundcloud_target_type(page, metadata)
    if target_type == "track":
        return extract_track_provider_data(page, metadata)
    if target_type == "playlist":
        return extract_playlist_provider_data(page, metadata)
    if target_type == "user":
        return extract_user_provider_data(page, metadata)
    return {"embed": _embed_data(page)}


def soundcloud_target_type(
    page: SoundCloudPage,
    metadata: ExtractedMetadata,
) -> str | None:
    target_type = _TARGET_BY_OG_TYPE.get(metadata["type"].casefold())
    if target_type is not None:
        return target_type

    for resource_type, target in (
        ("sound", "track"),
        ("playlist", "playlist"),
        ("user", "user"),
    ):
        if _hydration_record(page, resource_type):
            return target
    return None


def _resource_base(
    resource_type: str,
    resource: Mapping[str, object],
    metadata: ExtractedMetadata,
) -> dict[str, object]:
    data: dict[str, object] = {"resource_type": resource_type}
    identifier = resource.get("id")
    if identifier is not None:
        data["resource_id"] = str(identifier)
    urn = resource.get("urn")
    if isinstance(urn, str) and urn:
        data["urn"] = urn
    title = (_string(resource.get("title")) or metadata["title"])[:500]
    if title:
        data["title"] = title
    return data


def _track_summary(track: Mapping[str, object]) -> dict[str, object]:
    user = _mapping(track.get("user"))
    summary: dict[str, object] = {}
    identifier = track.get("id")
    if identifier is not None:
        summary["resource_id"] = str(identifier)
    _copy_fields(
        summary,
        track,
        (
            "title",
            "permalink_url",
            "artwork_url",
            "genre",
            "playback_count",
            "likes_count",
        ),
    )
    _copy_alias(summary, track, "duration_ms", "full_duration", "duration")
    _copy_alias(summary, user, "artist_name", "username", "full_name")
    _copy_alias(summary, user, "artist_url", "permalink_url")
    return summary


def _copy_fields(
    target: dict[str, object],
    source: Mapping[str, object],
    fields: tuple[str, ...],
) -> None:
    for key in fields:
        value = source.get(key)
        if value is not None:
            target[key] = value


def _copy_alias(
    target: dict[str, object],
    source_record: Mapping[str, object],
    target_key: str,
    *source_keys: str,
) -> None:
    for source_key in source_keys:
        value = source_record.get(source_key)
        if value is not None:
            target[target_key] = value
            return


def _copy_description(
    target: dict[str, object],
    source: Mapping[str, object],
    fallback: str,
) -> None:
    description = _plain_text(source.get("description")) or fallback
    if description:
        target["description"] = description[:2000]


def _copy_embed(target: dict[str, object], page: SoundCloudPage) -> None:
    embed = _embed_data(page)
    if embed:
        target["embed"] = embed


def _embed_data(page: SoundCloudPage) -> dict[str, object]:
    fields = {
        "author_name": "author_name",
        "author_url": "author_url",
        "height": "height",
        "thumbnail_url": "thumbnail_url",
        "width": "width",
    }
    embed = {
        output_key: page.oembed[input_key]
        for output_key, input_key in fields.items()
        if page.oembed.get(input_key) is not None
    }
    player_url = _player_url(_string(page.oembed.get("html")))
    if player_url:
        embed["player_url"] = player_url
    return embed


def _player_url(embed_html: str) -> str:
    if not embed_html:
        return ""
    parser = _PlayerIframeParser()
    parser.feed(embed_html)
    return parser.player_url


def _is_player_url(value: str) -> bool:
    player = urlsplit(value)
    if (
        player.scheme != "https"
        or player.hostname != "w.soundcloud.com"
        or player.path.rstrip("/") != "/player"
        or player.username is not None
        or player.password is not None
    ):
        return False

    resource_url = parse_qs(player.query).get("url", [""])[0]
    resource = urlsplit(resource_url)
    return resource.hostname == "api.soundcloud.com" and resource.path.startswith(
        ("/tracks/", "/playlists/", "/users/")
    )


def _hydration_record(page: SoundCloudPage, name: str) -> dict[str, object]:
    body = page.body
    if len(body) > MAX_HTML_BYTES:
        return {}
    source = body.decode("utf-8", "replace")
    marker = "window.__sc_hydration"
    marker_index = source.find(marker)
    if marker_index < 0:
        return {}
    array_start = source.find("[", source.find("=", marker_index))
    if array_start < 0:
        return {}
    array_end = _matching_json_end(source, array_start)
    if array_end is None:
        return {}

    payload = source[array_start:array_end]
    # Transcoding entries double-escape quotes inside MIME strings; those fields are unused here.
    payload = re.sub(
        r'("mime_type":")[^,}]*',
        r'\1application/octet-stream"',
        payload,
    )
    try:
        entries = json.loads(payload)
    except (json.JSONDecodeError, TypeError):
        return {}

    if not isinstance(entries, list):
        return {}
    for entry in entries:
        if isinstance(entry, dict) and entry.get("hydratable") == name:
            data = entry.get("data")
            if isinstance(data, dict):
                return data
    return {}


def _matching_json_end(source: str, start: int) -> int | None:
    depth = 0
    in_string = False
    escaped = False
    for index in range(start, len(source)):
        character = source[index]
        if in_string:
            if escaped:
                escaped = False
            elif character == "\\":
                escaped = True
            elif character == '"':
                in_string = False
            continue
        if character == '"':
            in_string = True
        elif character in "[{":
            depth += 1
        elif character in "]}":
            depth -= 1
            if depth == 0:
                return index + 1
    return None


def _open_graph_description(page: Any) -> str:
    for element in page.css("meta"):
        attrs = element.attrib
        if attrs.get("property", "").casefold() == "og:description":
            return _string(attrs.get("content"))
    return ""


def _plain_text(value: object) -> str:
    text = unescape(_string(value))
    text = re.sub(r"<[^>]*>", " ", text)
    return " ".join(text.split())


def _string(value: object) -> str:
    return value.strip() if isinstance(value, str) else ""


def _mapping(value: object) -> Mapping[str, object]:
    return value if isinstance(value, Mapping) else {}
