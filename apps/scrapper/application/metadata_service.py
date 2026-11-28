from contracts.errors import MetadataRequestError, UpstreamResponseError
from contracts.response import FetcherName, MetadataResponse, build_metadata_response
from contracts.settings import MAX_HTML_BYTES
from routing import validate_public_url
from sources.fetcher import FetchMode
from sources.selector import select_source

_TOKEN_PROVIDERS = {"twitch"}


def process_metadata_request(
    url: object,
    provider: object,
    target: object,
    mode: object = "fetcher",
    access_token: object = None,
    client_id: object = None,
) -> MetadataResponse:
    if not isinstance(mode, str) or mode not in ("fetcher", "session"):
        raise MetadataRequestError("mode must be either fetcher or session.")
    if not isinstance(provider, str) or not isinstance(target, str):
        raise MetadataRequestError("provider and target must be strings.")
    if access_token is not None and not isinstance(access_token, str):
        raise MetadataRequestError("accessToken must be a string.")
    if client_id is not None and not isinstance(client_id, str):
        raise MetadataRequestError("clientId must be a string.")
    if client_id is not None and provider != "twitch":
        raise MetadataRequestError("clientId is only supported for Twitch.")

    source = select_source(provider, target)
    requested_url = url.strip() if isinstance(url, str) else ""
    normalized_url = validate_public_url(url)
    fetch_mode: FetchMode = "session" if mode == "session" else "fetcher"
    fetch_options: dict[str, object] = {"headers": source.headers}
    if provider in _TOKEN_PROVIDERS:
        fetch_options["access_token"] = access_token
    if provider == "twitch":
        fetch_options["client_id"] = client_id
    page = source.fetch(normalized_url, fetch_mode, **fetch_options)

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
    metadata = source.extract_metadata(page, requested_url, final_url, provider)
    provider_data = source.extract_provider_data(page, metadata)
    fetcher: FetcherName = "FetcherSession" if fetch_mode == "session" else "Fetcher"
    return build_metadata_response(
        metadata,
        fetcher=fetcher,
        target_type=target,
        provider_data=provider_data,
    )
