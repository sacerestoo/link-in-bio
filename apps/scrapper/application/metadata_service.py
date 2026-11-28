from contracts.errors import MetadataRequestError, UpstreamResponseError
from contracts.response import FetcherName, MetadataResponse, build_metadata_response
from contracts.settings import MAX_HTML_BYTES
from routing import resolve_target, validate_public_url
from sources.fetcher import FetchMode
from sources.selector import select_source


def process_metadata_request(
    url: object,
    mode: str = "fetcher",
) -> MetadataResponse:
    if mode not in ("fetcher", "session"):
        raise MetadataRequestError("mode must be either fetcher or session.")

    requested_url = url.strip() if isinstance(url, str) else ""
    normalized_url = validate_public_url(url)
    route = resolve_target(normalized_url)
    source = select_source(route.target)
    fetch_mode: FetchMode = "session" if mode == "session" else "fetcher"
    page = source.fetch(
        normalized_url,
        fetch_mode,
        headers=source.headers,
    )

    if not 200 <= page.status < 300:
        raise UpstreamResponseError(page.status)

    if len(page.body or b"") > MAX_HTML_BYTES:
        raise MetadataRequestError(
            "The target page is too large. Only HTML pages up to 4 MB can be processed.",
            413,
        )

    content_type = str(page.headers.get("content-type", "") or "").casefold()
    if content_type and not any(
        media_type in content_type for media_type in source.accepted_content_types
    ):
        raise MetadataRequestError(
            "The target URL returned an unsupported content type.",
            415,
        )

    final_url = str(getattr(page, "url", None) or normalized_url)
    metadata = source.extract_metadata(page, requested_url, final_url, route.provider)
    provider_data = source.extract_provider_data(page, metadata)
    fetcher: FetcherName = "FetcherSession" if fetch_mode == "session" else "Fetcher"
    return build_metadata_response(
        metadata,
        fetcher=fetcher,
        target_type=route.target_type,
        provider_data=provider_data,
    )
