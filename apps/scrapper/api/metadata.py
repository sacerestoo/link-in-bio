import json
import logging
from http import HTTPStatus
from urllib.parse import parse_qs

from application import process_metadata_request
from contracts.errors import MetadataRequestError, UpstreamResponseError
from contracts.settings import MAX_HTML_BYTES, MAX_REDIRECTS, REQUEST_TIMEOUT
from routing import URLNormalizationError

logger = logging.getLogger(__name__)


def _send_json(start_response, status: int, payload: dict) -> list[bytes]:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    start_response(
        f"{status} {HTTPStatus(status).phrase}",
        [
            ("Content-Type", "application/json; charset=utf-8"),
            ("Content-Length", str(len(body))),
            ("Cache-Control", "no-store"),
            ("X-Content-Type-Options", "nosniff"),
            ("Access-Control-Allow-Origin", "*"),
            ("Access-Control-Allow-Methods", "GET, OPTIONS"),
        ],
    )
    return [body]


def handler(environ, start_response) -> list[bytes]:
    method = environ.get("REQUEST_METHOD", "GET")
    if method == "OPTIONS":
        start_response(
            "204 No Content",
            [
                ("Allow", "GET, OPTIONS"),
                ("Access-Control-Allow-Origin", "*"),
                ("Access-Control-Allow-Methods", "GET, OPTIONS"),
                ("Content-Length", "0"),
            ],
        )
        return []

    if method != "GET":
        return _send_json(
            start_response,
            405,
            {"error": "Only GET requests are supported."},
        )

    query = parse_qs(environ.get("QUERY_STRING", ""), keep_blank_values=True)
    if "url" in query:
        mode = query.get("mode", ["fetcher"])[0]
        try:
            result = process_metadata_request(query["url"][0], mode)
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

    return _send_json(
        start_response,
        200,
        {
            "service": "Meta Scout API",
            "status": "ok",
            "endpoint": "/api/metadata",
            "method": "GET",
            "request": "/api/metadata?url=https%3A%2F%2Fexample.com",
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
