import pytest
from unittest.mock import patch
from app.config import Settings


def test_allow_all_origins_defaults_false():
    s = Settings(supabase_url="http://x", supabase_service_role_key="key")
    assert s.allow_all_origins is False


def test_allow_all_origins_reads_from_env():
    with patch.dict("os.environ", {"ALLOW_ALL_ORIGINS": "true"}):
        s = Settings(supabase_url="http://x", supabase_service_role_key="key")
        assert s.allow_all_origins is True


@pytest.mark.asyncio
async def test_cors_allows_localhost(client):
    response = await client.options(
        "/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


@pytest.mark.asyncio
async def test_cors_allows_electron_app_origin(client):
    response = await client.options(
        "/health",
        headers={
            "Origin": "app://.",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.headers.get("access-control-allow-origin") == "app://."
