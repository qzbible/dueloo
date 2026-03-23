from fastapi import APIRouter, HTTPException, Response, Request, Header
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import httpx
from database import db
from models import User, UserSession
from auth import get_current_user, get_session_token

router = APIRouter(prefix="/api")


@router.post("/auth/session")
async def create_session(session_id: str, response: Response):
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Session invalide")
        user_data = resp.json()
    
    user_id = None
    existing_user = await db.users.find_one({"email": user_data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": user_data["name"], "picture": user_data.get("picture")}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = User(user_id=user_id, email=user_data["email"], name=user_data["name"], picture=user_data.get("picture", ""), created_at=datetime.now(timezone.utc).isoformat())
        user_dict = new_user.model_dump()
        await db.users.insert_one(user_dict)
    
    session_token = user_data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session = UserSession(user_id=user_id, session_token=session_token, expires_at=expires_at.isoformat(), created_at=datetime.now(timezone.utc).isoformat())
    session_dict = session.model_dump()
    await db.user_sessions.insert_one(session_dict)
    
    response.set_cookie(key="session_token", value=session_token, httponly=True, secure=True, samesite="none", path="/", max_age=7*24*60*60)
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return User(**user_doc)


@router.get("/auth/me")
async def get_me(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    if user.premium_expires_at:
        premium_expires = user.premium_expires_at
        if premium_expires.tzinfo is None:
            premium_expires = premium_expires.replace(tzinfo=timezone.utc)
        if premium_expires < datetime.now(timezone.utc):
            await db.users.update_one({"user_id": user.user_id}, {"$set": {"is_premium": False, "premium_expires_at": None}})
            user.is_premium = False
            user.premium_expires_at = None
    return user


@router.post("/auth/logout")
async def logout(request: Request, response: Response, authorization: Optional[str] = Header(None)):
    token = get_session_token(request, authorization)
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}
