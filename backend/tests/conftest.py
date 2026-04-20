import pytest
import asyncio
from httpx import AsyncClient
from unittest.mock import patch, MagicMock
import sys
import os
from mongomock_motor import AsyncMongoMockClient

# Add the backend directory to sys.path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock the database before importing anything that uses it
mock_client = AsyncMongoMockClient()
mock_db = mock_client['test_db']

# Apply patches GLOBALLY at the module level before server/auth are ever imported
import database
database.db = mock_db
database.client = mock_client

# Force the mock onto any modules that might have already imported the real 'db'
import auth
import routes.games_routes
import server
import routes.auth_routes

for module in [database, auth, routes.games_routes, server, routes.auth_routes]:
    if hasattr(module, 'db'):
        module.db = mock_db
        print(f"DEBUG CONFTEST: Injected mock_db into {module.__name__}")
    if hasattr(module, 'client'):
        module.client = mock_client
        print(f"DEBUG CONFTEST: Injected mock_client into {module.__name__}")

@pytest.fixture(autouse=True)
def mock_database():
    """Fixture to ensure mock_db is available and clean."""
    yield mock_db

@pytest.fixture
async def ac():
    """Async HTTP client fixture for FastAPI with session-aware auth monkey-patching."""
    from server import fastapi_app as app
    from httpx import ASGITransport
    from fastapi import Request
    from models import User
    import auth
    import server
    import routes.games_routes
    import routes.auth_routes
    
    # Session-aware monkey-patch
    async def mock_get_current_user(request: Request, authorization: str = None):
        # Extract token from header or cookie
        token = auth.get_session_token(request, authorization)
        
        if not token:
            from fastapi import HTTPException
            raise HTTPException(status_code=401, detail="Non authentifié")
            
        # Look up session in mock DB
        session = await mock_db.user_sessions.find_one({"session_token": token})
        
        if not session:
            from fastapi import HTTPException
            raise HTTPException(status_code=401, detail="Session invalide")
            
        # Look up user
        user_doc = await mock_db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
        return User(**user_doc)

    # List of modules to patch
    modules_to_patch = [auth, server, routes.games_routes, routes.auth_routes]
    
    originals = {}
    for mod in modules_to_patch:
        if hasattr(mod, 'get_current_user'):
            originals[mod] = mod.get_current_user
            mod.get_current_user = mock_get_current_user
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    
    # Restore original functions
    for mod, orig in originals.items():
        mod.get_current_user = orig

@pytest.fixture
def anyio_backend():
    return "asyncio"

@pytest.fixture
async def test_user(mock_database):
    """Create a test user and seed game modes in the mock database."""
    # Seed a few game modes needed for tests
    await mock_database.game_modes.insert_many([
        {"mode_id": "quiz_qui_a_dit", "available": True, "name": "Qui a dit ?"},
        {"mode_id": "chess", "available": True, "name": "Échecs"}
    ])
    
    user_id = "test-user-123"
    user_data = {
        "user_id": user_id,
        "email": "test@example.com",
        "name": "Test User",
        "is_premium": False,
        "level": 1,
        "xp": 0,
        "lives": 5,
        "coins": 0,
        "created_at": "2024-01-01T00:00:00"
    }
    await mock_database.users.insert_one(user_data)
    
    session_token = "test-token-123"
    await mock_database.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": "2025-01-01T00:00:00"
    })
    
    return {"user_id": user_id, "token": session_token}
