import json
import os
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import pytest
from dotenv import dotenv_values, load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env.local", override=True)

server_env = dotenv_values(
    Path(__file__).resolve().parents[2] / "server" / ".env.local"
)
for key in (
    "TWITCH_CLIENT_ID",
    "TWITCH_CLIENT_SECRET",
):
    value = server_env.get(key)
    if value:
        os.environ[key] = value


@pytest.fixture(scope="session")
def twitch_credentials() -> tuple[str, str]:
    client_id = os.environ.get("TWITCH_CLIENT_ID", "").strip()
    client_secret = os.environ.get("TWITCH_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        pytest.skip("Twitch app credentials are not configured for live tests.")

    body = urlencode(
        {
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "client_credentials",
        }
    ).encode()
    request = Request(
        "https://id.twitch.tv/oauth2/token",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urlopen(request, timeout=10) as response:
        payload = json.loads(response.read())
    token = payload.get("access_token") if isinstance(payload, dict) else None
    if not isinstance(token, str) or not token:
        pytest.fail("Twitch did not issue an app access token for live tests.")
    return token, client_id
