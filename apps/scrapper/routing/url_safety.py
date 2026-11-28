import ipaddress
import re
import socket
from urllib.parse import urlsplit, urlunsplit

from contracts.errors import MetadataRequestError

MAX_URL_LENGTH = 2048
_DEFAULT_PORTS = {"http": 80, "https": 443}
_BLOCKED_SUFFIXES = (
    ".localhost",
    ".local",
    ".internal",
    ".test",
    ".invalid",
    ".example",
)


class URLNormalizationError(ValueError):
    pass


def _normalize_host(host: str) -> str:
    host = host.rstrip(".")
    if not host or "%" in host:
        raise URLNormalizationError("The URL must contain a valid hostname.")

    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        try:
            ascii_host = host.encode("idna").decode("ascii").casefold()
        except UnicodeError:
            raise URLNormalizationError("The URL hostname is invalid.") from None

        labels = ascii_host.split(".")
        if len(ascii_host) > 253 or any(
            re.fullmatch(r"[a-z0-9](?:[a-z0-9-]*[a-z0-9])?", label) is None
            for label in labels
        ):
            raise URLNormalizationError("The URL hostname is invalid.")

        if ascii_host == "localhost" or ascii_host.endswith(_BLOCKED_SUFFIXES):
            raise URLNormalizationError("Only public website URLs are allowed.")
        return ascii_host

    if not address.is_global:
        raise URLNormalizationError("Only public IP addresses are allowed.")
    return address.compressed.casefold()


def normalize_url(value: object) -> str:
    if not isinstance(value, str) or not value.strip():
        raise URLNormalizationError("Please provide a URL.")

    value = value.strip()
    if len(value) > MAX_URL_LENGTH:
        raise URLNormalizationError("URL must be 2,048 characters or fewer.")
    if any(ord(character) < 32 or ord(character) == 127 for character in value):
        raise URLNormalizationError("The URL contains invalid characters.")
    if "://" not in value:
        value = f"https://{value}"

    try:
        parts = urlsplit(value)
        port = parts.port
    except ValueError:
        raise URLNormalizationError("Please check the URL format.") from None

    scheme = parts.scheme.casefold()
    if scheme not in _DEFAULT_PORTS:
        raise URLNormalizationError("Only HTTP or HTTPS URLs are allowed.")
    if not parts.hostname or parts.username is not None or parts.password is not None:
        raise URLNormalizationError(
            "The URL must include a hostname and must not contain user information."
        )
    if port is not None and port != _DEFAULT_PORTS[scheme]:
        raise URLNormalizationError("Only standard web ports (80 and 443) are allowed.")

    host = _normalize_host(parts.hostname)
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        host_for_url = host
    else:
        host_for_url = f"[{host}]" if address.version == 6 else host

    return urlunsplit((scheme, host_for_url, parts.path or "/", parts.query, ""))


def validate_public_url(value: object) -> str:
    normalized_url = normalize_url(value)
    parts = urlsplit(normalized_url)
    host = parts.hostname
    if host is None:
        raise MetadataRequestError("The URL must include a hostname.")

    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        port = parts.port or (443 if parts.scheme == "https" else 80)
        try:
            records = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
        except OSError:
            raise MetadataRequestError("Could not resolve the URL hostname.") from None

        found_public_address = False
        for record in records:
            address_text = record[4][0].split("%", 1)[0]
            try:
                address = ipaddress.ip_address(address_text)
            except ValueError:
                continue

            ipv4_mapped = getattr(address, "ipv4_mapped", None)
            policy_address = ipv4_mapped or address
            if not policy_address.is_global:
                raise MetadataRequestError(
                    "Only URLs that resolve to public IP addresses are allowed.",
                    403,
                )
            found_public_address = True

        if not found_public_address:
            raise MetadataRequestError("Could not resolve the URL hostname.")
        return normalized_url

    if not address.is_global:
        raise MetadataRequestError(
            "Only URLs that resolve to public IP addresses are allowed.",
            403,
        )
    return normalized_url
