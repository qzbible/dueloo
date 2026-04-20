import asyncio
from unittest.mock import patch
import os
import sys

# Setup mock
from mongomock_motor import AsyncMongoMockClient
mock_client = AsyncMongoMockClient()
mock_db = mock_client['test_db']

# Absolute imports from current dir
sys.path.append(os.getcwd())

with patch('database.db', mock_db):
    import auth
    from database import db
    print(f"DEBUG SCRIPT: db is mock: {db is mock_db}")
    print(f"DEBUG SCRIPT: auth.db is mock: {auth.db is mock_db}")
    
    async def run():
        # Insert test data
        await mock_db.users.insert_one({"user_id": "u1", "email": "e", "name": "n"})
        await mock_db.user_sessions.insert_one({
            "session_token": "t1", 
            "user_id": "u1", 
            "expires_at": "2099-01-01T00:00:00"
        })
        
        # Call auth
        from fastapi import Request
        mock_request = patch('fastapi.Request').start()
        mock_request.cookies = {"session_token": "t1"}
        
        try:
            user = await auth.get_current_user(mock_request)
            print(f"DEBUG SCRIPT: Success! User: {user.user_id}")
        except Exception as e:
            print(f"DEBUG SCRIPT: Failed: {e}")

    asyncio.run(run())
