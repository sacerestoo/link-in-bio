import json
import logging
import os
import secrets
from collections.abc import Callable, Mapping
from http import HTTPStatus
from typing import BinaryIO, TypeGuard, cast
from urllib.parse import parse_qs

from application import process_metadata_request
from contracts.errors import MetadataRequestError, UpstreamResponseError
from contracts.settings import MAX_HTML_BYTES, MAX_REDIRECTS, REQUEST_TIMEOUT
from routing import URLNormalizationError

logger = logging.getLogger(__name__)
MAX_REQUEST_BYTES = 8192
WsgiEnviron = Mapping[str, object]
StartResponse = Callable[[str, list[tuple[str, str]]], object]


def _env_string(environ: WsgiEnviron, key: str, default: str = "") -> str:
    value = environ.get(key, default)
    return value if isinstance(value, str) else default


def _is_json_object(value: object) -> TypeGuard[dict[str, object]]:
    return isinstance(value, dict) and all(isinstance(key, str) for key in value)


def _is_authorized(environ: WsgiEnviron) -> bool | None:
    expected_token = os.environ.get("SCRAPPER_API_TOKEN", "").strip()
    if expected_token == "":
        return None
    authorization = _env_string(environ, "HTTP_AUTHORIZATION")
    scheme, separator, token = authorization.partition(" ")
    return (
        scheme.casefold() == "bearer"
        and separator == " "
        and secrets.compare_digest(token, expected_token)
    )


def _send_json(
    start_response: StartResponse,
    status: int,
    payload: Mapping[str, object],
) -> list[bytes]:
    body = json.dumps(dict(payload), ensure_ascii=False).encode("utf-8")
    _ = start_response(
        f"{status} {HTTPStatus(status).phrase}",
        [
            ("Content-Type", "application/json; charset=utf-8"),
            ("Content-Length", str(len(body))),
            ("Cache-Control", "no-store"),
            ("X-Content-Type-Options", "nosniff"),
            ("Access-Control-Allow-Origin", "*"),
            ("Access-Control-Allow-Methods", "GET, POST, OPTIONS"),
            ("Access-Control-Allow-Headers", "Authorization, Content-Type"),
        ],
    )
    return [body]


def _read_json_request(environ: WsgiEnviron) -> dict[str, object]:
    content_type = _env_string(environ, "CONTENT_TYPE").split(";", 1)[0].strip()
    if content_type.casefold() != "application/json":
        raise MetadataRequestError("Content-Type must be application/json.", 415)

    try:
        length = int(_env_string(environ, "CONTENT_LENGTH", "0"))
    except ValueError:
        raise MetadataRequestError("The request body length is invalid.") from None
    if length <= 0 or length > MAX_REQUEST_BYTES:
        raise MetadataRequestError("The request body is empty or too large.", 413)

    try:
        stream = cast(BinaryIO, environ.get("wsgi.input"))
        payload = cast(object, json.loads(stream.read(length)))
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise MetadataRequestError("The request body must be valid JSON.") from None
    if not _is_json_object(payload):
        raise MetadataRequestError("The request body must be a JSON object.")
    return payload


def handler(environ: WsgiEnviron, start_response: StartResponse) -> list[bytes]:
    method = _env_string(environ, "REQUEST_METHOD", "GET")
    if method == "OPTIONS":
        _ = start_response(
            "204 No Content",
            [
                ("Allow", "GET, POST, OPTIONS"),
                ("Access-Control-Allow-Origin", "*"),
                ("Access-Control-Allow-Methods", "GET, POST, OPTIONS"),
                ("Access-Control-Allow-Headers", "Authorization, Content-Type"),
                ("Content-Length", "0"),
            ],
        )
        return []

    if method == "GET":
        query = parse_qs(_env_string(environ, "QUERY_STRING"), keep_blank_values=True)
        if "url" in query:
            return _send_json(
                start_response,
                405,
                {"error": "Metadata requests must use POST."},
            )
        return _send_json(
            start_response,
            200,
            {
                "service": "Meta Scout API",
                "status": "ok",
                "endpoint": "/api/metadata",
                "method": "POST",
                "request": {
                    "url": "https://example.com",
                    "provider": "generic",
                    "target": "webpage",
                },
                "default_mode": "fetcher",
                "modes": ["fetcher", "session"],
                "browser_rendering": False,
                "limits": {
                    "timeout_seconds": REQUEST_TIMEOUT,
                    "max_redirects": MAX_REDIRECTS,
                    "max_html_bytes": MAX_HTML_BYTES,
                },
            },
        )

    if method != "POST":
        return _send_json(
            start_response,
            405,
            {"error": "Only GET and POST requests are supported."},
        )

    authorized = _is_authorized(environ)
    if authorized is None:
        return _send_json(
            start_response,
            503,
            {"error": "Metadata service authentication is not configured."},
        )
    if not authorized:
        return _send_json(start_response, 401, {"error": "Unauthorized."})

    try:
        payload = _read_json_request(environ)
        result = process_metadata_request(
            payload.get("url"),
            payload.get("provider"),
            payload.get("target"),
            payload.get("mode", "fetcher"),
        )
    except URLNormalizationError as error:
        return _send_json(start_response, 400, {"error": str(error)})
    except MetadataRequestError as error:
        return _send_json(start_response, error.status, {"error": str(error)})
    except UpstreamResponseError as error:
        return _send_json(
            start_response,
            502,
            {
                "error": "The target page returned a non-success HTTP status.",
                "target_status": error.status,
            },
        )
    except Exception:
        logger.exception("Metadata request failed.")
        return _send_json(
            start_response,
            502,
            {
                "error": "Could not fetch the target page. Please check that the URL is accessible."
            },
        )

    return _send_json(start_response, 200, result)
