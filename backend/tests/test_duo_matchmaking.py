"""
Test suite for Duo Mode Matchmaking Bug Fix
Tests:
1. POST /api/duo/matchmaking (create match) returns user_id in response
2. POST /api/duo/matchmaking with friend_code (join match) returns user_id in response
3. GET /api/duo/leaderboard works (not caught by {match_id} route)
4. GET /api/duo/history works for authenticated premium users
5. GET /api/duo/stats works for authenticated users
6. GET /api/duo/{actual_match_id} still works correctly
"""

import pytest
import requests
import os
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials created via mongosh
SESSION_TOKEN = "test_session_duo_1774202767892"
USER_ID = "test-user-duo-1774202767892"


class TestDuoRouteOrdering:
    """Test that static duo routes are not caught by the dynamic {match_id} route"""
    
    def test_duo_leaderboard_route_accessible(self):
        """GET /api/duo/leaderboard should work (not be caught by {match_id})"""
        response = requests.get(
            f"{BASE_URL}/api/duo/leaderboard",
            headers={"Authorization": f"Bearer {SESSION_TOKEN}"}
        )
        # Should return 200 with leaderboard data, not 404 (match not found)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Leaderboard should return a list"
        print(f"✓ /api/duo/leaderboard returns {len(data)} entries")
    
    def test_duo_stats_route_accessible(self):
        """GET /api/duo/stats should work for authenticated users"""
        response = requests.get(
            f"{BASE_URL}/api/duo/stats",
            headers={"Authorization": f"Bearer {SESSION_TOKEN}"}
        )
        # Should return 200 with stats, not 404
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "mmr" in data, "Stats should contain mmr field"
        assert "wins" in data, "Stats should contain wins field"
        assert "losses" in data, "Stats should contain losses field"
        print(f"✓ /api/duo/stats returns stats: MMR={data['mmr']}, wins={data['wins']}")
    
    def test_duo_history_route_accessible(self):
        """GET /api/duo/history should work for premium users"""
        response = requests.get(
            f"{BASE_URL}/api/duo/history",
            headers={"Authorization": f"Bearer {SESSION_TOKEN}"}
        )
        # Should return 200 with history (user is premium), not 404
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "History should return a list"
        print(f"✓ /api/duo/history returns {len(data)} matches")
    
    def test_duo_active_matches_route_accessible(self):
        """GET /api/duo/active-matches should work"""
        response = requests.get(
            f"{BASE_URL}/api/duo/active-matches",
            headers={"Authorization": f"Bearer {SESSION_TOKEN}"}
        )
        # Should return 200, not 404
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Active matches should return a list"
        print(f"✓ /api/duo/active-matches returns {len(data)} active matches")


class TestDuoMatchmakingUserIdResponse:
    """Test that matchmaking endpoints return user_id in response"""
    
    def test_create_match_returns_user_id(self):
        """POST /api/duo/matchmaking (create match) should return user_id"""
        response = requests.post(
            f"{BASE_URL}/api/duo/matchmaking",
            json={"mode": "friend"},
            headers={"Authorization": f"Bearer {SESSION_TOKEN}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Critical: user_id must be in response
        assert "user_id" in data, f"Response must contain user_id. Got: {data.keys()}"
        assert data["user_id"] is not None, "user_id should not be None"
        assert data["user_id"] != "undefined", "user_id should not be 'undefined'"
        
        # Other expected fields
        assert "match_id" in data, "Response should contain match_id"
        assert "friend_code" in data, "Response should contain friend_code"
        assert "role" in data, "Response should contain role"
        assert data["role"] == "player1", "Creator should be player1"
        assert "status" in data, "Response should contain status"
        assert data["status"] == "waiting", "New match should have 'waiting' status"
        
        print(f"✓ Create match returns user_id: {data['user_id']}")
        print(f"  match_id: {data['match_id']}, friend_code: {data['friend_code']}")
        
        # Store for join test
        return data
    
    def test_join_match_returns_user_id(self):
        """POST /api/duo/matchmaking with friend_code should return user_id"""
        # First create a match
        create_response = requests.post(
            f"{BASE_URL}/api/duo/matchmaking",
            json={"mode": "friend"},
            headers={"Authorization": f"Bearer {SESSION_TOKEN}"}
        )
        assert create_response.status_code == 200
        create_data = create_response.json()
        friend_code = create_data["friend_code"]
        
        # Create a second test user to join
        import subprocess
        result = subprocess.run([
            "mongosh", "--eval", f"""
            use('test_database');
            var userId = 'test-user-duo2-' + Date.now();
            var sessionToken = 'test_session_duo2_' + Date.now();
            db.users.insertOne({{
              user_id: userId,
              email: 'test.duo2.' + Date.now() + '@example.com',
              name: 'Test Duo User 2',
              picture: 'https://via.placeholder.com/150',
              level: 3,
              xp: 50,
              lives: 5,
              coins: 20,
              is_premium: false,
              created_at: new Date()
            }});
            db.user_sessions.insertOne({{
              user_id: userId,
              session_token: sessionToken,
              expires_at: new Date(Date.now() + 7*24*60*60*1000),
              created_at: new Date()
            }});
            print('SESSION_TOKEN2=' + sessionToken);
            print('USER_ID2=' + userId);
            """
        ], capture_output=True, text=True)
        
        # Parse the output to get session token
        output = result.stdout
        session_token_2 = None
        for line in output.split('\n'):
            if line.startswith('SESSION_TOKEN2='):
                session_token_2 = line.split('=')[1]
        
        if not session_token_2:
            pytest.skip("Could not create second test user")
        
        # Join the match with second user
        join_response = requests.post(
            f"{BASE_URL}/api/duo/matchmaking",
            json={"mode": "friend", "friend_code": friend_code},
            headers={"Authorization": f"Bearer {session_token_2}"}
        )
        
        assert join_response.status_code == 200, f"Expected 200, got {join_response.status_code}: {join_response.text}"
        join_data = join_response.json()
        
        # Critical: user_id must be in response
        assert "user_id" in join_data, f"Join response must contain user_id. Got: {join_data.keys()}"
        assert join_data["user_id"] is not None, "user_id should not be None"
        assert join_data["user_id"] != "undefined", "user_id should not be 'undefined'"
        
        # Other expected fields
        assert "match_id" in join_data, "Response should contain match_id"
        assert join_data["match_id"] == create_data["match_id"], "Match IDs should match"
        assert "role" in join_data, "Response should contain role"
        assert join_data["role"] == "player2", "Joiner should be player2"
        assert "status" in join_data, "Response should contain status"
        assert join_data["status"] == "ready", "Joined match should have 'ready' status"
        
        print(f"✓ Join match returns user_id: {join_data['user_id']}")
        print(f"  match_id: {join_data['match_id']}, role: {join_data['role']}")


class TestDuoMatchRetrieval:
    """Test that GET /api/duo/{match_id} still works correctly"""
    
    def test_get_match_by_id(self):
        """GET /api/duo/{match_id} should return match data"""
        # First create a match
        create_response = requests.post(
            f"{BASE_URL}/api/duo/matchmaking",
            json={"mode": "friend"},
            headers={"Authorization": f"Bearer {SESSION_TOKEN}"}
        )
        assert create_response.status_code == 200
        match_id = create_response.json()["match_id"]
        
        # Get the match
        get_response = requests.get(
            f"{BASE_URL}/api/duo/{match_id}",
            headers={"Authorization": f"Bearer {SESSION_TOKEN}"}
        )
        
        assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}: {get_response.text}"
        data = get_response.json()
        
        assert data["match_id"] == match_id, "Match ID should match"
        assert "player1_id" in data, "Should contain player1_id"
        assert "status" in data, "Should contain status"
        
        print(f"✓ GET /api/duo/{match_id} returns match data")
    
    def test_get_nonexistent_match_returns_404(self):
        """GET /api/duo/{invalid_match_id} should return 404"""
        response = requests.get(
            f"{BASE_URL}/api/duo/nonexistent_match_12345",
            headers={"Authorization": f"Bearer {SESSION_TOKEN}"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ GET /api/duo/nonexistent_match returns 404")


class TestAuthEndpoint:
    """Test that /api/auth/me works correctly"""
    
    def test_auth_me_returns_user(self):
        """GET /api/auth/me should return user data"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {SESSION_TOKEN}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "user_id" in data, "Should contain user_id"
        assert "email" in data, "Should contain email"
        assert "name" in data, "Should contain name"
        
        print(f"✓ /api/auth/me returns user: {data['name']} ({data['user_id']})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
