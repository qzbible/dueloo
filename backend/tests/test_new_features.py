"""
Test suite for BibleQuest new features:
- Tournament system (create, register, start, report, detail)
- Spectator mode (active-matches)
- Mots Cachés (Word Search) game
- Labyrinthe de l'Exode (Maze) game
- Duo leaderboard route ordering fix
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials created in MongoDB
TEST_SESSION_TOKEN = "test_session_tour_1774204450516"
TEST_USER_ID = "test-user-tour-1774204450516"


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def auth_headers():
    """Authentication headers"""
    return {
        "Authorization": f"Bearer {TEST_SESSION_TOKEN}",
        "Content-Type": "application/json"
    }


class TestDuoEndpoints:
    """Test Duo endpoints including route ordering fix"""
    
    def test_duo_leaderboard_works(self, api_client, auth_headers):
        """GET /api/duo/leaderboard should work (not caught by {match_id} route)"""
        response = api_client.get(f"{BASE_URL}/api/duo/leaderboard", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Leaderboard should return a list"
        print(f"✓ Duo leaderboard returned {len(data)} entries")
    
    def test_duo_active_matches(self, api_client, auth_headers):
        """GET /api/duo/active-matches returns list of active matches for spectator"""
        response = api_client.get(f"{BASE_URL}/api/duo/active-matches", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Active matches should return a list"
        print(f"✓ Active matches returned {len(data)} matches")


class TestTournamentSystem:
    """Test Tournament CRUD and bracket generation"""
    
    tournament_id = None
    
    def test_get_active_tournaments(self, api_client):
        """GET /api/tournaments/active returns list of tournaments"""
        response = api_client.get(f"{BASE_URL}/api/tournaments/active")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Should return a list of tournaments"
        print(f"✓ Active tournaments: {len(data)} found")
    
    def test_create_tournament(self, api_client, auth_headers):
        """POST /api/tournaments/create creates a tournament (requires auth)"""
        payload = {
            "name": f"Test Tournament {int(time.time())}",
            "max_players": 8
        }
        response = api_client.post(
            f"{BASE_URL}/api/tournaments/create",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "tournament_id" in data, "Response should contain tournament_id"
        assert "message" in data, "Response should contain message"
        TestTournamentSystem.tournament_id = data["tournament_id"]
        print(f"✓ Tournament created: {data['tournament_id']}")
    
    def test_get_tournament_detail(self, api_client):
        """GET /api/tournaments/{id} returns tournament detail"""
        if not TestTournamentSystem.tournament_id:
            pytest.skip("No tournament created")
        
        response = api_client.get(f"{BASE_URL}/api/tournaments/{TestTournamentSystem.tournament_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["tournament_id"] == TestTournamentSystem.tournament_id
        assert data["status"] == "registration"
        assert "participants" in data
        assert "brackets" in data
        print(f"✓ Tournament detail: {data['name']}, status={data['status']}")
    
    def test_register_tournament(self, api_client, auth_headers):
        """POST /api/tournaments/{id}/register registers a user"""
        if not TestTournamentSystem.tournament_id:
            pytest.skip("No tournament created")
        
        response = api_client.post(
            f"{BASE_URL}/api/tournaments/{TestTournamentSystem.tournament_id}/register",
            json={},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "participants_count" in data
        print(f"✓ Registered to tournament, participants: {data['participants_count']}")
    
    def test_register_duplicate_fails(self, api_client, auth_headers):
        """POST /api/tournaments/{id}/register fails for duplicate registration"""
        if not TestTournamentSystem.tournament_id:
            pytest.skip("No tournament created")
        
        response = api_client.post(
            f"{BASE_URL}/api/tournaments/{TestTournamentSystem.tournament_id}/register",
            json={},
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400 for duplicate, got {response.status_code}"
        print("✓ Duplicate registration correctly rejected")
    
    def test_start_tournament_needs_2_players(self, api_client, auth_headers):
        """POST /api/tournaments/{id}/start requires minimum 2 participants"""
        if not TestTournamentSystem.tournament_id:
            pytest.skip("No tournament created")
        
        response = api_client.post(
            f"{BASE_URL}/api/tournaments/{TestTournamentSystem.tournament_id}/start",
            json={},
            headers=auth_headers
        )
        # Should fail with only 1 participant
        assert response.status_code == 400, f"Expected 400 (need 2 players), got {response.status_code}"
        print("✓ Start tournament correctly requires 2+ participants")
    
    def test_tournament_not_found(self, api_client):
        """GET /api/tournaments/{invalid_id} returns 404"""
        response = api_client.get(f"{BASE_URL}/api/tournaments/invalid_tournament_id")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid tournament returns 404")


class TestMotsCachesGame:
    """Test Mots Cachés (Word Search) game data generation"""
    
    def test_start_mots_caches_game(self, api_client, auth_headers):
        """POST /api/games/start with mode_id=mots_caches returns grid with placements"""
        payload = {"mode_id": "mots_caches"}
        response = api_client.post(
            f"{BASE_URL}/api/games/start",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify game_data structure
        assert "game_data" in data, "Response should contain game_data"
        game_data = data["game_data"]
        
        assert "grid" in game_data, "game_data should contain grid"
        assert "words" in game_data, "game_data should contain words"
        assert "grid_size" in game_data, "game_data should contain grid_size"
        assert "placements" in game_data, "game_data should contain placements"
        
        # Verify grid structure
        grid = game_data["grid"]
        grid_size = game_data["grid_size"]
        assert len(grid) == grid_size, f"Grid should have {grid_size} rows"
        assert all(len(row) == grid_size for row in grid), "All rows should have same length"
        
        # Verify words
        words = game_data["words"]
        assert len(words) > 0, "Should have words to find"
        
        # Verify placements
        placements = game_data["placements"]
        assert len(placements) == len(words), "Should have placement for each word"
        
        print(f"✓ Mots Cachés: {grid_size}x{grid_size} grid, {len(words)} words: {words}")
        print(f"  Placements: {placements}")


class TestLabyrintheGame:
    """Test Labyrinthe de l'Exode (Maze) game data generation"""
    
    def test_start_labyrinthe_game(self, api_client, auth_headers):
        """POST /api/games/start with mode_id=labyrinthe_exode returns maze data"""
        payload = {"mode_id": "labyrinthe_exode"}
        response = api_client.post(
            f"{BASE_URL}/api/games/start",
            json=payload,
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify game_data structure
        assert "game_data" in data, "Response should contain game_data"
        game_data = data["game_data"]
        
        assert "maze" in game_data, "game_data should contain maze"
        assert "width" in game_data, "game_data should contain width"
        assert "height" in game_data, "game_data should contain height"
        assert "start" in game_data, "game_data should contain start position"
        assert "end" in game_data, "game_data should contain end position"
        assert "questions" in game_data, "game_data should contain questions"
        
        # Verify maze structure
        maze = game_data["maze"]
        width = game_data["width"]
        height = game_data["height"]
        assert len(maze) == height, f"Maze should have {height} rows"
        assert all(len(row) == width for row in maze), "All rows should have same width"
        
        # Verify start and end positions
        start = game_data["start"]
        end = game_data["end"]
        assert len(start) == 2, "Start should be [x, y]"
        assert len(end) == 2, "End should be [x, y]"
        
        # Verify questions
        questions = game_data["questions"]
        assert len(questions) > 0, "Should have questions"
        for q in questions:
            assert "text" in q, "Question should have text"
            assert "options" in q, "Question should have options"
            assert "answer" in q, "Question should have answer"
        
        print(f"✓ Labyrinthe: {width}x{height} maze, start={start}, end={end}")
        print(f"  Questions: {len(questions)}")


class TestAuthRequired:
    """Test that auth-required endpoints properly reject unauthenticated requests"""
    
    def test_create_tournament_requires_auth(self, api_client):
        """POST /api/tournaments/create requires authentication"""
        response = api_client.post(
            f"{BASE_URL}/api/tournaments/create",
            json={"name": "Test", "max_players": 8}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Create tournament requires auth")
    
    def test_register_tournament_requires_auth(self, api_client):
        """POST /api/tournaments/{id}/register requires authentication"""
        response = api_client.post(
            f"{BASE_URL}/api/tournaments/some_id/register",
            json={}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Register tournament requires auth")
    
    def test_active_matches_requires_auth(self, api_client):
        """GET /api/duo/active-matches requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/duo/active-matches")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Active matches requires auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
