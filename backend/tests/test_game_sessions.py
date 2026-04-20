import pytest
from httpx import AsyncClient
import uuid

@pytest.mark.anyio
async def test_create_and_recover_session(ac: AsyncClient, mock_database, test_user):
    """Test the complete flow of starting a game and recovering its session."""
    
    # 1. Start a game
    headers = {"Authorization": f"Bearer {test_user['token']}"}
    start_payload = {
        "mode_id": "quiz_qui_a_dit",
        "lang": "fr",
        "config": {"opponent": "ai"}
    }
    
    response = await ac.post("/api/games/start", json=start_payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    session_id = data["session_id"]
    game_data = data["game_data"]
    
    # 2. Recover the session
    recovery_response = await ac.get(f"/api/games/session/{session_id}", headers=headers)
    assert recovery_response.status_code == 200
    recovered_data = recovery_response.json()
    
    # 3. Assert match
    assert recovered_data["session_id"] == session_id
    assert recovered_data["mode_id"] == "quiz_qui_a_dit"
    assert len(recovered_data["game_data"]) == len(game_data)

@pytest.mark.anyio
async def test_recover_invalid_session(ac: AsyncClient, test_user):
    """Test recovery of a non-existent session."""
    headers = {"Authorization": f"Bearer {test_user['token']}"}
    response = await ac.get(f"/api/games/session/non-existent-id", headers=headers)
    assert response.status_code == 404
    assert response.json()["detail"] == "Session non trouvée ou terminée"

@pytest.mark.anyio
async def test_session_contains_required_fields(ac: AsyncClient, mock_database, test_user):
    """Ensure the session recovery returns enough data for frontend to reconstruct state."""
    headers = {"Authorization": f"Bearer {test_user['token']}"}
    start_payload = {"mode_id": "chess", "lang": "fr"}
    
    res = await ac.post("/api/games/start", json=start_payload, headers=headers)
    session_id = res.json()["session_id"]
    
    res_rec = await ac.get(f"/api/games/session/{session_id}", headers=headers)
    data = res_rec.json()
    
    assert "session_id" in data
    assert "game_data" in data
    assert "mode_id" in data
    assert "created_at" in data
