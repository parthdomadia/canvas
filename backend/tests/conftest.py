import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
import app.database as db_module


@pytest.fixture(autouse=True)
async def reset_supabase_client():
    """Reset the global Supabase client before each test to avoid connection reuse issues on Windows."""
    db_module._client = None
    yield
    db_module._client = None


@pytest.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
