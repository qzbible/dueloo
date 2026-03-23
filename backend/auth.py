from fastapi import Request, Header, HTTPException
from typing import Optional
from datetime import datetime, timezone
from database import db
from models import User


def get_session_token(request: Request, authorization: Optional[str] = Header(None)) -> Optional[str]:
    token = request.cookies.get("session_token")
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
    return token


async def get_current_user(request: Request, authorization: Optional[str] = Header(None)) -> User:
    token = get_session_token(request, authorization)
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifié")
    
    session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Session invalide")
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expirée")
    
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    if isinstance(user_doc.get('created_at'), str):
        pass  # already string, fine
    if isinstance(user_doc.get('premium_expires_at'), str):
        pass  # already string, fine
    
    return User(**user_doc)
