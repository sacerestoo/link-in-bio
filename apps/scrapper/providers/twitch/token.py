import json
import os
import secrets
import ssl
import time
from collections.abc import Callable, Mapping
from typing import TypeVar
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import certifi

from contracts.errors import MetadataRequestError

_OAUTH_TOKEN_URL = "https://id.twitch.tv/oauth2/token"
_TOKEN_KEY = "url-metadata:twitch:app-access-token"
_TOKEN_LOCK_KEY = f"{_TOKEN_KEY}:lock"
_TOKEN_SAFETY_MARGIN_SECONDS = 120
_LOCK_TTL_SECONDS = 15
_LOCK_WAIT_SECONDS = 20
_LOCK_POLL_SECONDS = 0.25
_HTTP_TIMEOUT_SECONDS = 10
_TLS_CONTEXT = ssl.create_default_context(cafile=certifi.where())
_ResponseT = TypeVar("_ResponseT")


def _environment_value(*names: str) -> str:
    for name in names:
        value = os.environ.get(name, "").strip()
        if value:
            return value
    return ""


def _redis_config() -> tuple[str, str]:
    url = _environment_value("KV_REST_API_URL", "UPSTASH_REDIS_REST_URL")
    token = _environment_value("KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN")
    if not url or not token:
        raise MetadataRequestError("Twitch token storage is not configured.", 503)
    return url.rstrip("/"), token


def _redis_command(config: tuple[str, str], *command: object) -> object:
    url, token = config
    request = Request(
        url,
        data=json.dumps(command).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(
            request,
            timeout=_HTTP_TIMEOUT_SECONDS,
            context=_TLS_CONTEXT,
        ) as response:
            payload = json.loads(response.read())
    except (
        HTTPError,
        URLError,
        TimeoutError,
        OSError,
        UnicodeDecodeError,
        json.JSONDecodeError,
    ):
        raise MetadataRequestError(
            "Twitch token storage is unavailable.", 503
        ) from None

    if (
        not isinstance(payload, Mapping)
        or "error" in payload
        or "result" not in payload
    ):
        raise MetadataRequestError(
            "Twitch token storage returned an invalid response.", 503
        )
    return payload["result"]


def _cached_token(config: tuple[str, str]) -> str:
    token = _redis_command(config, "GET", _TOKEN_KEY)
    return token if isinstance(token, str) else ""


def _issue_token() -> tuple[str, int]:
    client_id = os.environ.get("TWITCH_CLIENT_ID", "").strip()
    client_secret = os.environ.get("TWITCH_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise MetadataRequestError("Twitch app credentials are not configured.", 503)

    request = Request(
        _OAUTH_TOKEN_URL,
        data=urlencode(
            {
                "client_id": client_id,
                "client_secret": client_secret,
                "grant_type": "client_credentials",
            }
        ).encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urlopen(
            request,
            timeout=_HTTP_TIMEOUT_SECONDS,
            context=_TLS_CONTEXT,
        ) as response:
            payload = json.loads(response.read())
    except (
        HTTPError,
        URLError,
        TimeoutError,
        OSError,
        UnicodeDecodeError,
        json.JSONDecodeError,
    ):
        raise MetadataRequestError(
            "Twitch could not issue an app access token.", 502
        ) from None

    if not isinstance(payload, Mapping):
        raise MetadataRequestError(
            "Twitch returned an invalid app access token response.", 502
        )
    token = payload.get("access_token")
    expires_in = payload.get("expires_in")
    if not isinstance(token, str) or not token or not isinstance(expires_in, int):
        raise MetadataRequestError(
            "Twitch returned an invalid app access token response.", 502
        )
    return token, expires_in


def _release_lock(config: tuple[str, str], lock_value: str) -> None:
    script = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end"
    try:
        _redis_command(config, "EVAL", script, 1, _TOKEN_LOCK_KEY, lock_value)
    except MetadataRequestError:
        pass


def _invalidate_if_current(config: tuple[str, str], stale_token: str) -> None:
    script = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end"
    _redis_command(config, "EVAL", script, 1, _TOKEN_KEY, stale_token)


def get_access_token() -> str:
    """Return the shared Twitch app token, issuing it once when the cache expires."""
    config = _redis_config()
    token = _cached_token(config)
    if token:
        return token

    lock_value = secrets.token_urlsafe(24)
    deadline = time.monotonic() + _LOCK_WAIT_SECONDS
    while time.monotonic() < deadline:
        acquired = _redis_command(
            config,
            "SET",
            _TOKEN_LOCK_KEY,
            lock_value,
            "EX",
            _LOCK_TTL_SECONDS,
            "NX",
        )
        if acquired == "OK":
            try:
                token = _cached_token(config)
                if token:
                    return token

                token, expires_in = _issue_token()
                ttl = max(1, expires_in - _TOKEN_SAFETY_MARGIN_SECONDS)
                _redis_command(config, "SET", _TOKEN_KEY, token, "EX", ttl)
                return token
            finally:
                _release_lock(config, lock_value)

        token = _cached_token(config)
        if token:
            return token
        time.sleep(_LOCK_POLL_SECONDS)

    raise MetadataRequestError("Timed out waiting for Twitch token renewal.", 503)


def request_with_access_token(request: Callable[[str], _ResponseT]) -> _ResponseT:
    """Retry a Twitch request once with a renewed token after HTTP 401."""
    token = get_access_token()
    response = request(token)
    if getattr(response, "status", None) != 401:
        return response

    _invalidate_if_current(_redis_config(), token)
    return request(get_access_token())
