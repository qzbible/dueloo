"""
Backend tests for i18n (internationalization) feature
Tests that game content is returned in the correct language (FR/EN)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test session setup - create a test user for authenticated endpoints
@pytest.fixture(scope="module")
def test_session():
    """Create a test session for authenticated endpoints"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Create test user directly in DB for testing
    from motor.motor_asyncio import AsyncIOMotorClient
    import asyncio
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    
    async def setup_test_user():
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        test_user_id = f"test-user-i18n-{int(time.time())}"
        test_session_token = f"test_session_i18n_{int(time.time())}"
        
        # Create test user
        await db.users.insert_one({
            "user_id": test_user_id,
            "email": f"test_i18n_{int(time.time())}@test.com",
            "name": "Test i18n User",
            "level": 1,
            "xp": 0,
            "lives": 5,
            "coins": 100,
            "is_premium": True,
            "created_at": "2024-01-01T00:00:00+00:00"
        })
        
        # Create session
        from datetime import datetime, timezone, timedelta
        expires_at = datetime.now(timezone.utc) + timedelta(days=1)
        await db.user_sessions.insert_one({
            "user_id": test_user_id,
            "session_token": test_session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        client.close()
        return test_session_token, test_user_id
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    token, user_id = loop.run_until_complete(setup_test_user())
    loop.close()
    
    session.headers.update({"Authorization": f"Bearer {token}"})
    session.cookies.set("session_token", token)
    
    return {"session": session, "token": token, "user_id": user_id}


class TestGameStartLanguage:
    """Test that /api/games/start returns content in the correct language"""
    
    def test_quiz_qui_a_dit_french(self, test_session):
        """Test quiz_qui_a_dit returns French content by default"""
        response = test_session["session"].post(
            f"{BASE_URL}/api/games/start",
            json={"mode_id": "quiz_qui_a_dit", "lang": "fr"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "game_data" in data
        assert "quotes" in data["game_data"]
        
        # Check French content
        quotes = data["game_data"]["quotes"]
        assert len(quotes) > 0
        
        # French quotes should contain French text
        french_indicators = ["Je suis", "L'Éternel", "Avant que", "Que ton"]
        has_french = any(
            any(indicator in quote.get("text", "") for indicator in french_indicators)
            for quote in quotes
        )
        assert has_french, f"Expected French content, got: {quotes}"
        print(f"✓ quiz_qui_a_dit returns French content: {quotes[0]['text'][:50]}...")
    
    def test_quiz_qui_a_dit_english(self, test_session):
        """Test quiz_qui_a_dit returns English content when lang=en"""
        response = test_session["session"].post(
            f"{BASE_URL}/api/games/start",
            json={"mode_id": "quiz_qui_a_dit", "lang": "en"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "game_data" in data
        assert "quotes" in data["game_data"]
        
        quotes = data["game_data"]["quotes"]
        assert len(quotes) > 0
        
        # English quotes should contain English text
        english_indicators = ["I am", "The Lord", "Before you", "Your kingdom"]
        has_english = any(
            any(indicator in quote.get("text", "") for indicator in english_indicators)
            for quote in quotes
        )
        assert has_english, f"Expected English content, got: {quotes}"
        print(f"✓ quiz_qui_a_dit returns English content: {quotes[0]['text'][:50]}...")
    
    def test_quiz_vrai_faux_french(self, test_session):
        """Test quiz_vrai_faux returns French statements"""
        response = test_session["session"].post(
            f"{BASE_URL}/api/games/start",
            json={"mode_id": "quiz_vrai_faux", "lang": "fr"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "game_data" in data
        assert "statements" in data["game_data"]
        
        statements = data["game_data"]["statements"]
        assert len(statements) > 0
        
        # French statements
        french_indicators = ["Jésus", "Moïse", "David", "Jonas", "Pierre", "Abraham"]
        has_french = any(
            any(indicator in stmt.get("text", "") for indicator in french_indicators)
            for stmt in statements
        )
        assert has_french, f"Expected French statements, got: {statements}"
        print(f"✓ quiz_vrai_faux returns French statements: {statements[0]['text'][:50]}...")
    
    def test_quiz_vrai_faux_english(self, test_session):
        """Test quiz_vrai_faux returns English statements when lang=en"""
        response = test_session["session"].post(
            f"{BASE_URL}/api/games/start",
            json={"mode_id": "quiz_vrai_faux", "lang": "en"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "game_data" in data
        assert "statements" in data["game_data"]
        
        statements = data["game_data"]["statements"]
        assert len(statements) > 0
        
        # English statements should have English text
        english_indicators = ["Jesus", "Moses", "David", "Jonah", "Peter", "Abraham"]
        has_english = any(
            any(indicator in stmt.get("text", "") for indicator in english_indicators)
            for stmt in statements
        )
        assert has_english, f"Expected English statements, got: {statements}"
        print(f"✓ quiz_vrai_faux returns English statements: {statements[0]['text'][:50]}...")
    
    def test_mots_caches_french(self, test_session):
        """Test mots_caches returns French words"""
        response = test_session["session"].post(
            f"{BASE_URL}/api/games/start",
            json={"mode_id": "mots_caches", "lang": "fr"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "game_data" in data
        assert "words" in data["game_data"]
        
        words = data["game_data"]["words"]
        assert len(words) > 0
        
        # French words
        french_words = ["GENESE", "EXODE", "JEAN", "MARC", "LUC", "ACTES", "PAUL", "DAVID"]
        has_french = any(word in french_words for word in words)
        assert has_french, f"Expected French words like GENESE, got: {words}"
        print(f"✓ mots_caches returns French words: {words}")
    
    def test_mots_caches_english(self, test_session):
        """Test mots_caches returns English words when lang=en"""
        response = test_session["session"].post(
            f"{BASE_URL}/api/games/start",
            json={"mode_id": "mots_caches", "lang": "en"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "game_data" in data
        assert "words" in data["game_data"]
        
        words = data["game_data"]["words"]
        assert len(words) > 0
        
        # English words
        english_words = ["GENESIS", "EXODUS", "JOHN", "MARK", "LUKE", "ACTS", "PAUL", "DAVID"]
        has_english = any(word in english_words for word in words)
        assert has_english, f"Expected English words like GENESIS, got: {words}"
        print(f"✓ mots_caches returns English words: {words}")
    
    def test_labyrinthe_exode_french(self, test_session):
        """Test labyrinthe_exode returns French maze questions"""
        response = test_session["session"].post(
            f"{BASE_URL}/api/games/start",
            json={"mode_id": "labyrinthe_exode", "lang": "fr"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "game_data" in data
        assert "questions" in data["game_data"]
        
        questions = data["game_data"]["questions"]
        assert len(questions) > 0
        
        # French questions
        french_indicators = ["Qui a guidé", "Combien de plaies", "Quelle mer"]
        has_french = any(
            any(indicator in q.get("text", "") for indicator in french_indicators)
            for q in questions
        )
        assert has_french, f"Expected French questions, got: {questions}"
        print(f"✓ labyrinthe_exode returns French questions: {questions[0]['text'][:50]}...")
    
    def test_labyrinthe_exode_english(self, test_session):
        """Test labyrinthe_exode returns English maze questions when lang=en"""
        response = test_session["session"].post(
            f"{BASE_URL}/api/games/start",
            json={"mode_id": "labyrinthe_exode", "lang": "en"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "game_data" in data
        assert "questions" in data["game_data"]
        
        questions = data["game_data"]["questions"]
        assert len(questions) > 0
        
        # English questions
        english_indicators = ["Who led", "How many plagues", "Which sea"]
        has_english = any(
            any(indicator in q.get("text", "") for indicator in english_indicators)
            for q in questions
        )
        assert has_english, f"Expected English questions, got: {questions}"
        print(f"✓ labyrinthe_exode returns English questions: {questions[0]['text'][:50]}...")
    
    def test_default_language_is_french(self, test_session):
        """Test that default language is French when lang is not specified"""
        response = test_session["session"].post(
            f"{BASE_URL}/api/games/start",
            json={"mode_id": "quiz_qui_a_dit"}  # No lang specified
        )
        assert response.status_code == 200
        
        data = response.json()
        quotes = data["game_data"]["quotes"]
        
        # Should default to French
        french_indicators = ["Je suis", "L'Éternel", "Avant que", "Que ton"]
        has_french = any(
            any(indicator in quote.get("text", "") for indicator in french_indicators)
            for quote in quotes
        )
        assert has_french, f"Expected French content by default, got: {quotes}"
        print(f"✓ Default language is French: {quotes[0]['text'][:50]}...")
    
    def test_chrono_versets_french(self, test_session):
        """Test chrono_versets returns French verses"""
        response = test_session["session"].post(
            f"{BASE_URL}/api/games/start",
            json={"mode_id": "chrono_versets", "lang": "fr"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "game_data" in data
        assert "verses" in data["game_data"]
        
        verses = data["game_data"]["verses"]
        assert len(verses) > 0
        
        # French verses
        french_indicators = ["Car Dieu a tant aimé", "L'Éternel est mon berger", "Je puis tout"]
        has_french = any(
            any(indicator in v.get("text", "") for indicator in french_indicators)
            for v in verses
        )
        assert has_french, f"Expected French verses, got: {verses}"
        print(f"✓ chrono_versets returns French verses: {verses[0]['text'][:50]}...")
    
    def test_chrono_versets_english(self, test_session):
        """Test chrono_versets returns English verses when lang=en"""
        response = test_session["session"].post(
            f"{BASE_URL}/api/games/start",
            json={"mode_id": "chrono_versets", "lang": "en"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "game_data" in data
        assert "verses" in data["game_data"]
        
        verses = data["game_data"]["verses"]
        assert len(verses) > 0
        
        # English verses
        english_indicators = ["For God so loved", "The Lord is my shepherd", "I can do all"]
        has_english = any(
            any(indicator in v.get("text", "") for indicator in english_indicators)
            for v in verses
        )
        assert has_english, f"Expected English verses, got: {verses}"
        print(f"✓ chrono_versets returns English verses: {verses[0]['text'][:50]}...")


class TestGameStartRequestModel:
    """Test that GameStartRequest model accepts lang parameter"""
    
    def test_lang_parameter_accepted(self, test_session):
        """Test that lang parameter is accepted in request"""
        # Test with lang=en
        response = test_session["session"].post(
            f"{BASE_URL}/api/games/start",
            json={"mode_id": "quiz_qui_a_dit", "lang": "en"}
        )
        assert response.status_code == 200
        
        # Test with lang=fr
        response = test_session["session"].post(
            f"{BASE_URL}/api/games/start",
            json={"mode_id": "quiz_qui_a_dit", "lang": "fr"}
        )
        assert response.status_code == 200
        print("✓ lang parameter is accepted in GameStartRequest")
    
    def test_invalid_mode_returns_404(self, test_session):
        """Test that invalid mode_id returns 404"""
        response = test_session["session"].post(
            f"{BASE_URL}/api/games/start",
            json={"mode_id": "invalid_mode", "lang": "en"}
        )
        assert response.status_code == 404
        print("✓ Invalid mode_id returns 404")


# Cleanup fixture
@pytest.fixture(scope="module", autouse=True)
def cleanup(test_session):
    """Cleanup test data after tests"""
    yield
    
    from motor.motor_asyncio import AsyncIOMotorClient
    import asyncio
    
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'test_database')
    
    async def cleanup_test_data():
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # Delete test users and sessions
        await db.users.delete_many({"email": {"$regex": "^test_i18n_"}})
        await db.user_sessions.delete_many({"session_token": {"$regex": "^test_session_i18n_"}})
        await db.game_sessions.delete_many({"user_id": {"$regex": "^test-user-i18n-"}})
        
        client.close()
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(cleanup_test_data())
    loop.close()
