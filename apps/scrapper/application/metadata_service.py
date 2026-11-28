import logging
from urllib.parse import urlsplit

from contracts.errors import MetadataRequestError
from contracts.response import FetcherName, MetadataResponse, build_metadata_response
from contracts.settings import MAX_HTML_BYTES
from routing import validate_public_url
from sources.fetcher import FetchMode
from sources.selector import select_source

_TOKEN_PROVIDERS = {"twitch"}
logger = logging.getLogger(__name__)


def _build_fallback_response(
    requested_url: str,
    final_url: str,
    provider: str,
    target: str,
    fetcher: FetcherName,
) -> MetadataResponse:
    metadata = {
        "requested_url": requested_url,
        "final_url": final_url,
        "provider": provider,
        "http_status": 200,
        "title": requested_url,
        "description": "",
        "image_url": "",
        "site_name": urlsplit(final_url).hostname or "",
        "type": "",
        "canonical_url": "",
        "favicon_url": "",
    }
    return build_metadata_response(
        metadata,
        fetcher=fetcher,
        target_type=target,
        is_fallback=True,
    )


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
    fetcher: FetcherName = source.fetcher_name or (
        "FetcherSession" if fetch_mode == "session" else "Fetcher"
    )

    try:
        page = source.fetch(normalized_url, fetch_mode, **fetch_options)
    except Exception:
        logger.exception(
            "Metadata fetch failed for %s; returning fallback metadata.", provider
        )
        return _build_fallback_response(
            requested_url,
            normalized_url,
            provider,
            target,
            fetcher,
        )

    final_url = str(getattr(page, "url", None) or normalized_url)
    page_status = page.status
    challenge_action = str(
        page.headers.get("x-amzn-waf-action", "")
        or page.headers.get("cf-mitigated", "")
    ).casefold()
    if not 200 <= page_status < 300 or challenge_action == "challenge":
        logger.warning(
            "Metadata source returned status %s for %s; returning fallback metadata.",
            page_status,
            provider,
        )
        return _build_fallback_response(
            requested_url,
            final_url,
            provider,
            target,
            fetcher,
        )

    if len(page.body or b"") > MAX_HTML_BYTES:
        logger.warning(
            "Metadata source exceeded the HTML size limit for %s; "
            "returning fallback metadata.",
            provider,
        )
        return _build_fallback_response(
            requested_url,
            final_url,
            provider,
            target,
            fetcher,
        )

    content_type = str(page.headers.get("content-type", "") or "").casefold()
    if content_type and not any(
        media_type in content_type for media_type in source.accepted_content_types
    ):
        logger.warning(
            "Metadata source returned unsupported content type %s for %s; "
            "returning fallback metadata.",
            content_type,
            provider,
        )
        return _build_fallback_response(
            requested_url,
            final_url,
            provider,
            target,
            fetcher,
        )

    try:
        metadata = source.extract_metadata(page, requested_url, final_url, provider)
        provider_data = source.extract_provider_data(page, metadata)
        response_target = target
        if source.resolve_target_type is not None:
            response_target = source.resolve_target_type(page, metadata) or target
    except Exception:
        logger.exception(
            "Metadata extraction failed for %s; returning fallback metadata.",
            provider,
        )
        return _build_fallback_response(
            requested_url,
            final_url,
            provider,
            target,
            fetcher,
        )

    return build_metadata_response(
        metadata,
        fetcher=fetcher,
        target_type=response_target,
        provider_data=provider_data,
    )
