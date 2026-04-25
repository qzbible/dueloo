import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import os
from pathlib import Path
from dotenv import load_dotenv

async def seed_test_user():
    ROOT_DIR = Path(__file__).parent
    load_dotenv(ROOT_DIR / '.env')
    
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME', 'game')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    user_id = "test_user_id"
    token = "test_token"
    
    # Create test user
    test_user = {
        "user_id": user_id,
        "email": "test@example.com",
        "name": "Test User",
        "picture": "https://via.placeholder.com/150",
        "level": 1,
        "xp": 0,
        "coins": 100,
        "is_premium": True,
        "is_admin": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.update_one({"user_id": user_id}, {"$set": test_user}, upsert=True)
    
    # Create test session
    test_session = {
        "user_id": user_id,
        "session_token": token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.user_sessions.update_one({"session_token": token}, {"$set": test_session}, upsert=True)
    
    # Create second test user
    user2_id = "test_user_2_id"
    token2 = "test_token_2"
    test_user2 = {
        "user_id": user2_id,
        "email": "test2@example.com",
        "name": "Test User 2",
        "picture": "https://via.placeholder.com/150",
        "level": 1,
        "xp": 0,
        "coins": 100,
        "is_premium": True,
        "is_admin": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.update_one({"user_id": user2_id}, {"$set": test_user2}, upsert=True)
    
    test_session2 = {
        "user_id": user2_id,
        "session_token": token2,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.update_one({"session_token": token2}, {"$set": test_session2}, upsert=True)

    # Create third test user
    user3_id = "test_user_3_id"
    token3 = "test_token_3"
    test_user3 = {
        "user_id": user3_id,
        "email": "test3@example.com",
        "name": "Test User 3",
        "picture": "https://via.placeholder.com/150",
        "level": 1,
        "xp": 0,
        "coins": 100,
        "is_premium": True,
        "is_admin": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.update_one({"user_id": user3_id}, {"$set": test_user3}, upsert=True)
    
    test_session3 = {
        "user_id": user3_id,
        "session_token": token3,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.update_one({"session_token": token3}, {"$set": test_session3}, upsert=True)

    print(f"Test users and sessions seeded. Tokens: {token}, {token2}, {token3}")

if __name__ == "__main__":
    asyncio.run(seed_test_user())
