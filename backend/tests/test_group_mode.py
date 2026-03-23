"""
Backend tests for Group Mode (Kahoot-style) feature
Tests: POST /api/group/create, POST /api/group/join, GET /api/group/:id,
       POST /api/group/:id/start, POST /api/group/:id/next
"""
import pytest
import requests
import os
import time
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# -------------------------------------------------------------------
# Fixtures
# -------------------------------------------------------------------
@pytest.fixture(scope="module")
def db_client():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    return db, client


@pytest.fixture(scope="module")
def test_users(db_client):
    """Create host + player users directly in DB for testing"""
    db, client = db_client
    ts = int(time.time() * 1000)

    host_user_id = f"test-group-host-{ts}"
    host_token = f"test_session_host_{ts}"
    player_user_id = f"test-group-player-{ts}"
    player_token = f"test_session_player_{ts}"

    async def setup():
        await db.users.insert_one({
            "user_id": host_user_id,
            "email": f"test.host.{ts}@example.com",
            "name": "Test Host",
            "picture": "https://via.placeholder.com/150",
            "is_premium": True,
            "xp": 0, "coins": 0, "level": 1,
        })
        await db.user_sessions.insert_one({
            "user_id": host_user_id,
            "session_token": host_token,
            "expires_at": "2030-01-01T00:00:00",
        })
        await db.users.insert_one({
            "user_id": player_user_id,
            "email": f"test.player.{ts}@example.com",
            "name": "Test Player",
            "picture": "https://via.placeholder.com/150",
            "is_premium": False,
            "xp": 0, "coins": 0, "level": 1,
        })
        await db.user_sessions.insert_one({
            "user_id": player_user_id,
            "session_token": player_token,
            "expires_at": "2030-01-01T00:00:00",
        })

    asyncio.get_event_loop().run_until_complete(setup())

    yield {
        "host_id": host_user_id,
        "host_token": host_token,
        "player_id": player_user_id,
        "player_token": player_token,
    }

    # Cleanup
    async def teardown():
        await db.users.delete_many({"user_id": {"$in": [host_user_id, player_user_id]}})
        await db.user_sessions.delete_many({"session_token": {"$in": [host_token, player_token]}})
        await db.group_sessions.delete_many({"host_id": host_user_id})

    asyncio.get_event_loop().run_until_complete(teardown())


# -------------------------------------------------------------------
# Tests: Group Session CRUD
# -------------------------------------------------------------------
class TestGroupCreate:
    """POST /api/group/create - Create a group session (requires auth)"""

    def test_create_group_session_success(self, test_users):
        response = requests.post(
            f"{BASE_URL}/api/group/create",
            json={"name": "TEST_Group Session", "num_questions": 5},
            cookies={"session_token": test_users["host_token"]},
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "session_id" in data, "Missing session_id in response"
        assert "pin_code" in data, "Missing pin_code in response"
        assert len(data["pin_code"]) == 6, f"PIN should be 6 digits, got {data['pin_code']}"
        assert data["pin_code"].isdigit(), f"PIN should be digits, got {data['pin_code']}"
        # Store for later tests
        TestGroupCreate.session_id = data["session_id"]
        TestGroupCreate.pin_code = data["pin_code"]
        print(f"PASS: Created group session {data['session_id']} with PIN {data['pin_code']}")

    def test_create_group_session_without_auth(self):
        response = requests.post(
            f"{BASE_URL}/api/group/create",
            json={"name": "Unauthorized Session"},
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"PASS: Unauthenticated create correctly returns {response.status_code}")

    def test_create_group_session_default_name(self, test_users):
        """Test with default name (no name field)"""
        response = requests.post(
            f"{BASE_URL}/api/group/create",
            json={},
            cookies={"session_token": test_users["host_token"]},
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "session_id" in data
        print(f"PASS: Created session with default name, id={data['session_id']}")


class TestGroupGet:
    """GET /api/group/:sessionId - Get group session info"""

    def test_get_group_session(self, test_users):
        # First create a session
        create_resp = requests.post(
            f"{BASE_URL}/api/group/create",
            json={"name": "TEST_Get Session"},
            cookies={"session_token": test_users["host_token"]},
        )
        assert create_resp.status_code == 200
        session_id = create_resp.json()["session_id"]

        get_resp = requests.get(
            f"{BASE_URL}/api/group/{session_id}",
            cookies={"session_token": test_users["host_token"]},
        )
        assert get_resp.status_code == 200, f"Expected 200, got {get_resp.status_code}: {get_resp.text}"
        data = get_resp.json()
        assert data["session_id"] == session_id
        assert data["name"] == "TEST_Get Session"
        assert "players" in data
        assert isinstance(data["players"], list)
        assert "_id" not in data, "MongoDB _id should not be in response"
        print(f"PASS: GET /api/group/{session_id} returns correct session data")

    def test_get_nonexistent_session(self, test_users):
        response = requests.get(
            f"{BASE_URL}/api/group/nonexistent_session_id_xyz",
            cookies={"session_token": test_users["host_token"]},
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"PASS: GET non-existent session returns 404")


class TestGroupJoin:
    """POST /api/group/join - Join a group session with PIN (requires auth)"""

    def test_join_group_session_success(self, test_users):
        # Create a session as host
        create_resp = requests.post(
            f"{BASE_URL}/api/group/create",
            json={"name": "TEST_Join Session"},
            cookies={"session_token": test_users["host_token"]},
        )
        assert create_resp.status_code == 200
        pin_code = create_resp.json()["pin_code"]
        session_id = create_resp.json()["session_id"]

        # Join as player
        join_resp = requests.post(
            f"{BASE_URL}/api/group/join",
            json={"pin_code": pin_code, "player_name": "TEST_Player1"},
            cookies={"session_token": test_users["player_token"]},
        )
        assert join_resp.status_code == 200, f"Expected 200, got {join_resp.status_code}: {join_resp.text}"
        data = join_resp.json()
        assert "session_id" in data
        assert data["session_id"] == session_id
        TestGroupJoin.joined_session_id = session_id
        TestGroupJoin.joined_pin = pin_code
        print(f"PASS: Player joined session {session_id} with PIN {pin_code}")

    def test_join_group_session_wrong_pin(self, test_users):
        join_resp = requests.post(
            f"{BASE_URL}/api/group/join",
            json={"pin_code": "000000", "player_name": "Intruder"},
            cookies={"session_token": test_users["player_token"]},
        )
        assert join_resp.status_code == 404, f"Expected 404, got {join_resp.status_code}"
        print(f"PASS: Wrong PIN returns 404")

    def test_join_group_session_without_auth(self):
        join_resp = requests.post(
            f"{BASE_URL}/api/group/join",
            json={"pin_code": "123456", "player_name": "Anon"},
        )
        assert join_resp.status_code in [401, 403], f"Expected 401/403, got {join_resp.status_code}"
        print(f"PASS: Unauthenticated join correctly returns {join_resp.status_code}")


class TestGroupStart:
    """POST /api/group/:sessionId/start - Start the session"""

    def test_start_group_session_success(self, test_users):
        # Create and join a session
        create_resp = requests.post(
            f"{BASE_URL}/api/group/create",
            json={"name": "TEST_Start Session", "num_questions": 5},
            cookies={"session_token": test_users["host_token"]},
        )
        assert create_resp.status_code == 200
        session_id = create_resp.json()["session_id"]
        pin_code = create_resp.json()["pin_code"]

        # Player joins
        requests.post(
            f"{BASE_URL}/api/group/join",
            json={"pin_code": pin_code, "player_name": "TEST_Joueur1"},
            cookies={"session_token": test_users["player_token"]},
        )

        # Host starts the session
        start_resp = requests.post(
            f"{BASE_URL}/api/group/{session_id}/start",
            cookies={"session_token": test_users["host_token"]},
        )
        assert start_resp.status_code == 200, f"Expected 200, got {start_resp.status_code}: {start_resp.text}"
        data = start_resp.json()
        assert "total_questions" in data
        assert data["total_questions"] > 0
        TestGroupStart.started_session_id = session_id
        print(f"PASS: Session started with {data['total_questions']} questions")

    def test_start_session_wrong_user(self, test_users):
        """Non-host cannot start a session"""
        create_resp = requests.post(
            f"{BASE_URL}/api/group/create",
            json={"name": "TEST_Host Only Session"},
            cookies={"session_token": test_users["host_token"]},
        )
        session_id = create_resp.json()["session_id"]

        start_resp = requests.post(
            f"{BASE_URL}/api/group/{session_id}/start",
            cookies={"session_token": test_users["player_token"]},  # player tries to start
        )
        assert start_resp.status_code in [403, 401], f"Expected 403/401, got {start_resp.status_code}"
        print(f"PASS: Non-host cannot start session, got {start_resp.status_code}")


class TestGroupNext:
    """POST /api/group/:sessionId/next - Next question"""

    def test_next_question_success(self, test_users):
        # Full flow: create, join, start, then get next question
        create_resp = requests.post(
            f"{BASE_URL}/api/group/create",
            json={"name": "TEST_Next Question Session", "num_questions": 5},
            cookies={"session_token": test_users["host_token"]},
        )
        assert create_resp.status_code == 200
        session_id = create_resp.json()["session_id"]
        pin_code = create_resp.json()["pin_code"]

        # Join
        requests.post(
            f"{BASE_URL}/api/group/join",
            json={"pin_code": pin_code, "player_name": "TEST_PlayerNext"},
            cookies={"session_token": test_users["player_token"]},
        )

        # Start
        start_resp = requests.post(
            f"{BASE_URL}/api/group/{session_id}/start",
            cookies={"session_token": test_users["host_token"]},
        )
        assert start_resp.status_code == 200
        total_q = start_resp.json()["total_questions"]

        # Get first question
        next_resp = requests.post(
            f"{BASE_URL}/api/group/{session_id}/next",
            cookies={"session_token": test_users["host_token"]},
        )
        assert next_resp.status_code == 200, f"Expected 200, got {next_resp.status_code}: {next_resp.text}"
        data = next_resp.json()
        assert "question_index" in data or "finished" in data, f"Unexpected response: {data}"
        if not data.get("finished"):
            assert "text" in data, "Missing 'text' in question response"
            assert data["question_index"] == 0, f"First question should be index 0, got {data['question_index']}"
        print(f"PASS: First question retrieved - index=0, text present")

    def test_next_question_until_finished(self, test_users):
        """Test cycling through all questions and finishing"""
        create_resp = requests.post(
            f"{BASE_URL}/api/group/create",
            json={"name": "TEST_Full Cycle Session", "num_questions": 3},
            cookies={"session_token": test_users["host_token"]},
        )
        session_id = create_resp.json()["session_id"]
        pin_code = create_resp.json()["pin_code"]

        requests.post(
            f"{BASE_URL}/api/group/join",
            json={"pin_code": pin_code, "player_name": "TEST_FullPlayer"},
            cookies={"session_token": test_users["player_token"]},
        )

        requests.post(f"{BASE_URL}/api/group/{session_id}/start",
                      cookies={"session_token": test_users["host_token"]})

        # Go through 3 questions + 1 more to finish
        for i in range(4):
            resp = requests.post(
                f"{BASE_URL}/api/group/{session_id}/next",
                cookies={"session_token": test_users["host_token"]},
            )
            assert resp.status_code == 200
            if resp.json().get("finished"):
                print(f"PASS: Session finished after {i+1} next calls")
                return

        print("PASS: All question calls returned 200")
