import re
from collections.abc import Iterator, Mapping
from urllib.parse import SplitResult, parse_qs, unquote, urlsplit

from contracts.response import ExtractedMetadata
from sources.html_metadata import extract_metadata as extract_html_metadata

_COUNT_PATTERN = re.compile(r"(?P<value>[\d,.]+)\s*(?P<suffix>[KMB])?", re.I)


def _url_parts(metadata: ExtractedMetadata) -> SplitResult:
    return urlsplit(metadata["requested_url"])


def _path_segments(metadata: ExtractedMetadata) -> list[str]:
    return [
        unquote(segment) for segment in _url_parts(metadata).path.split("/") if segment
    ]


def _query_value(metadata: ExtractedMetadata, name: str) -> str:
    return parse_qs(_url_parts(metadata).query).get(name, [""])[0]


def _album_id(metadata: ExtractedMetadata) -> str:
    segments = _path_segments(metadata)
    if len(segments) > 1 and segments[0] == "browse":
        return segments[1]

    album_id = _query_value(metadata, "list")
    return album_id if album_id.startswith("OLAK5uy_") else ""


def _mapping(value: object) -> Mapping[str, object]:
    return value if isinstance(value, Mapping) else {}


def _walk(value: object) -> Iterator[Mapping[str, object]]:
    if isinstance(value, Mapping):
        yield value
        for child in value.values():
            yield from _walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from _walk(child)


def _renderer(value: object, key: str) -> Mapping[str, object]:
    for node in _walk(value):
        result = node.get(key)
        if isinstance(result, Mapping):
            return result
    return {}


def _text(value: object) -> str:
    if isinstance(value, str):
        return value.strip()

    text = _mapping(value).get("simpleText")
    if isinstance(text, str) and text.strip():
        return text.strip()

    content = _mapping(value).get("content")
    if isinstance(content, str) and content.strip():
        return content.strip()

    runs = _mapping(value).get("runs")
    if isinstance(runs, list):
        return "".join(
            text_value
            for run in runs
            if isinstance((text_value := _mapping(run).get("text")), str)
        ).strip()

    return ""


def _count(value: object) -> tuple[int, bool] | None:
    text = _text(value)
    match = _COUNT_PATTERN.search(text.replace("−", "-"))
    if match is None:
        return None

    number = match.group("value").replace(",", "")
    suffix = (match.group("suffix") or "").upper()
    multiplier = {"": 1, "K": 1_000, "M": 1_000_000, "B": 1_000_000_000}[suffix]
    try:
        result = round(float(number) * multiplier)
    except ValueError:
        return None
    return result, bool(suffix or "." in number)


def _add_count(provider_data: dict[str, object], field: str, value: object) -> bool:
    count = _count(value)
    if count is None:
        return False

    provider_data[field], provider_data[f"{field}Approximate"] = count
    return True


def _base_provider_data(
    metadata: ExtractedMetadata, target_type: str, target_id: str
) -> dict[str, object]:
    provider_data: dict[str, object] = {f"{target_type}Id": target_id}
    image_url = metadata["image_url"]
    if image_url:
        provider_data[f"{target_type}ImageUrl"] = image_url
    return provider_data


def _thumbnail_url(value: object) -> str:
    candidates: list[tuple[int, str]] = []
    for node in _walk(value):
        url = node.get("url")
        if not isinstance(url, str) or not url.startswith("https://"):
            continue
        width = node.get("width")
        height = node.get("height")
        if isinstance(width, int) and isinstance(height, int):
            quality = width * height
        else:
            size = re.search(r"(?:w|s)(\d{2,4})", url)
            quality = int(size.group(1)) if size else 0
        candidates.append((quality, url))
    return max(candidates, default=(0, ""))[1]


def _api_data(page: object, endpoint: str) -> Mapping[str, object]:
    return _mapping(_mapping(getattr(page, "api_data", {})).get(endpoint))


def _track_rows(payload: object) -> list[Mapping[str, object]]:
    row_sets: list[list[Mapping[str, object]]] = []
    for renderer_key in ("musicShelfRenderer", "musicPlaylistShelfRenderer"):
        for node in _walk(payload):
            renderer = _mapping(node.get(renderer_key))
            contents = renderer.get("contents")
            if not isinstance(contents, list):
                continue
            rows = []
            for item in contents:
                row = _mapping(_mapping(item).get("musicResponsiveListItemRenderer"))
                playlist_item = _mapping(row.get("playlistItemData"))
                if playlist_item.get("videoId"):
                    rows.append(row)
            if rows:
                row_sets.append(rows)
    return max(row_sets, key=len, default=[])


def _duration_seconds(value: object) -> int | None:
    parts = _text(value).split(":")
    if not 2 <= len(parts) <= 3 or not all(part.isdecimal() for part in parts):
        return None
    seconds = 0
    for part in parts:
        seconds = seconds * 60 + int(part)
    return seconds


def _row_duration(row: Mapping[str, object]) -> int | None:
    fixed_columns = row.get("fixedColumns")
    if not isinstance(fixed_columns, list):
        return None
    for column in fixed_columns:
        renderer = _mapping(
            _mapping(column).get("musicResponsiveListItemFixedColumnRenderer")
        )
        duration = _duration_seconds(renderer.get("text"))
        if duration is not None:
            return duration
    return None


def _total_duration(rows: list[Mapping[str, object]]) -> tuple[int, bool] | None:
    durations = [
        duration for row in rows if (duration := _row_duration(row)) is not None
    ]
    if not durations:
        return None
    return sum(durations), len(durations) != len(rows)


def _header_track_count(header: Mapping[str, object]) -> int | None:
    match = re.search(
        r"\b([\d,]+)\s+(?:songs|tracks)\b",
        _text(header.get("secondSubtitle")),
        re.I,
    )
    return int(match.group(1).replace(",", "")) if match else None


def _track_count(header: Mapping[str, object], rows: list[Mapping[str, object]]) -> int:
    return _header_track_count(header) or len(rows)


def _header(payload: object) -> Mapping[str, object]:
    return _renderer(payload, "musicResponsiveHeaderRenderer")


def _browse_header_and_rows(
    page: object,
) -> tuple[Mapping[str, object], list[Mapping[str, object]]]:
    payload = _api_data(page, "browse")
    return _header(payload), _track_rows(payload)


def extract_youtube_music_metadata(
    page: object,
    requested_url: str,
    final_url: str,
    provider: str,
) -> ExtractedMetadata:
    html_page = getattr(page, "html_page", page)
    return extract_html_metadata(html_page, requested_url, final_url, provider)


def extract_artist_data(page: object, metadata: ExtractedMetadata) -> dict[str, object]:
    segments = _path_segments(metadata)
    artist_id = segments[1] if len(segments) > 1 else ""
    if not artist_id:
        return {}

    header = _renderer(_api_data(page, "browse"), "musicImmersiveHeaderRenderer")
    provider_data = _base_provider_data(metadata, "artist", artist_id)

    subscribe_button = _mapping(
        _mapping(header.get("subscriptionButton")).get("subscribeButtonRenderer")
    )
    _add_count(
        provider_data,
        "subscriberCount",
        subscribe_button.get("longSubscriberCountText")
        or subscribe_button.get("subscriberCountText"),
    )

    monthly_audience_text = header.get("monthlyListenerCount")
    if _add_count(provider_data, "monthlyAudienceCount", monthly_audience_text):
        provider_data["monthlyAudienceText"] = _text(monthly_audience_text)
    return provider_data


def extract_album_data(page: object, metadata: ExtractedMetadata) -> dict[str, object]:
    album_id = _album_id(metadata)
    if not album_id:
        return {}

    provider_data = _base_provider_data(metadata, "album", album_id)
    header, rows = _browse_header_and_rows(page)

    track_count = _track_count(header, rows)
    if track_count:
        provider_data["trackCount"] = track_count

    year_match = re.search(r"\b(?:19|20)\d{2}\b", _text(header.get("subtitle")))
    if year_match:
        provider_data["year"] = int(year_match.group())

    total_duration = _total_duration(rows)
    if total_duration is not None:
        (
            provider_data["totalDurationSeconds"],
            provider_data["totalDurationApproximate"],
        ) = total_duration

    artist_name = _text(header.get("straplineTextOne"))
    if artist_name:
        provider_data["artistName"] = artist_name
    artist_image = _thumbnail_url(header.get("straplineThumbnail"))
    if artist_image:
        provider_data["artistImageUrl"] = artist_image
    return provider_data


def extract_playlist_data(
    page: object, metadata: ExtractedMetadata
) -> dict[str, object]:
    playlist_id = _query_value(metadata, "list")
    if not playlist_id:
        return {}

    provider_data = _base_provider_data(metadata, "playlist", playlist_id)
    header, rows = _browse_header_and_rows(page)

    title = _text(header.get("title"))
    if title:
        provider_data["playlistTitle"] = title
    track_count = _track_count(header, rows)
    if track_count:
        provider_data["trackCount"] = track_count

    facepile = _mapping(header.get("facepile"))
    avatar_stack = _mapping(facepile.get("avatarStackViewModel"))
    owner_name = _text(avatar_stack.get("text")) or _text(
        header.get("straplineTextOne")
    )
    if owner_name:
        provider_data["ownerName"] = owner_name
    owner_image = _thumbnail_url(avatar_stack.get("avatars"))
    if owner_image:
        provider_data["ownerImageUrl"] = owner_image
    return provider_data
