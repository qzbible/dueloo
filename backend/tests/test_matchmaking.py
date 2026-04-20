import pytest
from httpx import AsyncClient
import uuid

@pytest.fixture
async def test_user2(mock_database):
    """Create a second test user and session."""
    user_id = "test-user-456"
    token = "test-token-456"
    
    await mock_database.users.insert_one({
        "user_id": user_id,
        "email": "player2@example.com",
        "name": "Player 2",
        "is_premium": False,
        "level": 1,
        "xp": 0,
        "lives": 5,
        "coins": 0
    })
    
    await mock_database.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": token,
        "expires_at": "2025-01-01T00:00:00"
    })
    
    return {"user_id": user_id, "token": token}

@pytest.mark.anyio
async def test_matchmaking_flow(ac: AsyncClient, mock_database, test_user, test_user2):
    """Test the complete flow of creating a match and another player joining."""
    
    # 1. Player 1 starts matchmaking
    headers1 = {"Authorization": f"Bearer {test_user['token']}"}
    resp1 = await ac.post("/api/duo/matchmaking", json={"mode_id": "chess"}, headers=headers1)
    assert resp1.status_code == 200
    data1 = resp1.json()
    match_id = data1["match_id"]
    friend_code = data1["friend_code"]
    assert data1["role"] == "player1"
    assert data1["status"] == "waiting"

    # 2. Player 2 joins using the friend code
    headers2 = {"Authorization": f"Bearer {test_user2['token']}"}
    resp2 = await ac.post("/api/duo/matchmaking", json={"friend_code": friend_code}, headers=headers2)
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["match_id"] == match_id
    assert data2["role"] == "player2"
    assert data2["status"] == "ready"

    # 3. Verify match status is 'ready' for Player 1
    resp3 = await ac.get(f"/api/duo/match/{match_id}", headers=headers1)
    assert resp3.status_code == 200
    assert resp3.json()["status"] == "ready"

@pytest.mark.anyio
async def test_matchmaking_invalid_code(ac: AsyncClient, test_user):
    """Test joining with an invalid friend code."""
    headers = {"Authorization": f"Bearer {test_user['token']}"}
    resp = await ac.post("/api/duo/matchmaking", json={"friend_code": "INVALID"}, headers=headers)
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Match non trouvé"
