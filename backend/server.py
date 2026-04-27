"""
BibleQuest Backend - Modular Architecture
Main entry point that imports route modules.
"""
from fastapi import FastAPI, Request, Response, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import socketio
import uuid
import os
import random
import string
import logging
import httpx

from database import db, client
from models import User, UserSession, GameStartRequest, GameSubmitRequest, CheckoutRequest, DuoMatchRequest, CreateGroupSessionRequest, JoinGroupRequest
from auth import get_current_user, get_session_token
from game_utils import generate_word_search_grid, generate_maze, calculate_score
from interactions_manager import interaction_manager
from i18n_content import (
    get_quiz_qui_a_dit, get_quiz_vrai_faux, get_chrono_versets,
    get_mots_caches, get_anagrammes, get_labyrinthe_questions
)

# Import route modules
from routes.auth_routes import router as auth_router
from routes.games_routes import router as games_router
from routes.admin_routes import router as admin_router

# ── App & Socket.IO setup ────────────────────────────────────────────
allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:3001")
if allowed_origins != "*":
    allowed_origins = [o.strip() for o in allowed_origins.split(",")]

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=allowed_origins,
    logger=True,
    engineio_logger=False
)

fastapi_app = FastAPI()
socket_app = socketio.ASGIApp(sio, fastapi_app, socketio_path='api/socket.io')

api_router = __import__('fastapi', fromlist=['APIRouter']).APIRouter(prefix="/api")

# ── Include modular route files ──────────────────────────────────────
fastapi_app.include_router(auth_router)
fastapi_app.include_router(games_router)

# ── Badges & Achievements ───────────────────────────────────────────
@api_router.get("/badges")
async def get_badges(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    user_badges = await db.user_badges.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    badge_ids = [ub["badge_id"] for ub in user_badges]
    if not badge_ids:
        return []
    badges = await db.badges.find({"badge_id": {"$in": badge_ids}}, {"_id": 0}).to_list(100)
    return badges

@api_router.get("/leaderboard")
async def get_leaderboard():
    users = await db.users.find({}, {"_id": 0, "user_id": 1, "name": 1, "picture": 1, "level": 1, "xp": 1}).sort("xp", -1).to_list(50)
    return users

# ── Daily Manna ──────────────────────────────────────────────────────
@api_router.get("/daily-manna/status")
async def daily_manna_status(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    manna = await db.daily_manna.find_one({"user_id": user.user_id, "date": today}, {"_id": 0})
    streak_doc = await db.daily_manna.find({"user_id": user.user_id}).sort("date", -1).to_list(7)
    return {"can_play": manna is None, "streak": len(streak_doc)}

@api_router.post("/daily-manna/complete")
async def complete_daily_manna(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    existing = await db.daily_manna.find_one({"user_id": user.user_id, "date": today})
    if existing:
        raise HTTPException(status_code=400, detail="Already completed today")
    await db.daily_manna.insert_one({"user_id": user.user_id, "date": today, "completed_at": datetime.now(timezone.utc).isoformat()})
    await db.users.update_one({"user_id": user.user_id}, {"$inc": {"xp": 20, "coins": 10}})
    return {"message": "Manna collected", "xp_earned": 20, "coins_earned": 10}

# ── Polyglot Badge Tracking ──────────────────────────────────────────
@api_router.get("/lang-progress")
async def get_lang_progress(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    tracking = await db.lang_tracking.find_one({"user_id": user.user_id}, {"_id": 0})
    if not tracking:
        return {"games_fr": 0, "games_en": 0, "polyglot_badge": False}
    
    games_fr = tracking.get("games_fr", 0)
    games_en = tracking.get("games_en", 0)
    polyglot_badge = games_fr >= 5 and games_en >= 5
    
    if polyglot_badge:
        existing = await db.user_badges.find_one({"user_id": user.user_id, "badge_id": "badge_polyglotte"})
        if not existing:
            await db.user_badges.insert_one({
                "user_id": user.user_id,
                "badge_id": "badge_polyglotte",
                "earned_at": datetime.now(timezone.utc).isoformat()
            })
            await db.users.update_one({"user_id": user.user_id}, {"$inc": {"xp": 100}})
    
    return {"games_fr": games_fr, "games_en": games_en, "polyglot_badge": polyglot_badge}

# ── Stripe / Premium ────────────────────────────────────────────────
@api_router.post("/checkout-session")
async def create_checkout_session(request: Request, checkout_req: CheckoutRequest, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    import stripe
    stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    prices = {"1_hour": 99, "24_hours": 299, "weekly": 499}
    amount = prices.get(checkout_req.package_type, 99)
    
    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{"price_data": {"currency": "eur", "product_data": {"name": f"BibleQuest Premium - {checkout_req.package_type}"}, "unit_amount": amount}, "quantity": 1}],
            mode="payment",
            success_url=checkout_req.success_url + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=checkout_req.cancel_url,
            metadata={"user_id": user.user_id, "package_type": checkout_req.package_type}
        )
        return {"checkout_url": session.url, "session_id": session.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/verify-payment")
async def verify_payment(request: Request, authorization: Optional[str] = Header(None)):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")
    
    import stripe
    stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        if session.payment_status == "paid":
            user_id = session.metadata.get("user_id")
            package_type = session.metadata.get("package_type")
            hours = {"1_hour": 1, "24_hours": 24, "weekly": 168}.get(package_type, 1)
            expires_at = datetime.now(timezone.utc) + timedelta(hours=hours)
            await db.users.update_one({"user_id": user_id}, {"$set": {"is_premium": True, "premium_expires_at": expires_at.isoformat()}})
            return {"status": "success", "premium_until": expires_at.isoformat()}
        return {"status": "pending"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Duo Matchmaking ─────────────────────────────────────────────────
matchmaking_queue = []
duo_rooms = {}

@api_router.post("/duo/matchmaking")
async def duo_matchmaking(request: Request, match_req: DuoMatchRequest, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    
    # Determine max_players with correct defaults per game mode
    max_players = match_req.max_players  # Could be None if not sent
    if max_players is None or max_players < 2:
        # Ludo supports 2-4 players; default to 4 to be most permissive
        max_players = 4 if match_req.mode_id == 'ludo' else 2
    
        
    if match_req.friend_code:
        # Search for the match by friend code (any status)
        match = await db.duo_matches.find_one({"friend_code": match_req.friend_code}, {"_id": 0})
        if match:
            match_id = match["match_id"]
            
            # 1. Check if user is already in this match (Allow rejoining even if 'playing')
            existing_role = None
            if user.user_id:
                for p in range(1, 5):
                    # Strict check: only match if BOTH are not None
                    p_id = match.get(f"player{p}_id")
                    if p_id and p_id == user.user_id:
                        existing_role = f"player{p}"
                        break

            
            if existing_role:
                return {
                    "match_id": match_id, 
                    "role": existing_role, 
                    "status": match["status"], 
                    "user_id": user.user_id, 
                    "mode_id": match.get("mode_id"),
                    "max_players": match.get("max_players", 2)
                }

            # 2. Allow joining if status is 'waiting' OR if it's 'ready'/'playing' but not full.
            # Only block if it's 'completed'.
            if match.get("status") == "completed":
                 raise HTTPException(status_code=400, detail="Ce match est déjà terminé")

            # Robust check for Ludo: use match value, default to 4
            effective_max = match.get("max_players", 2)
            if match.get("mode_id") == 'ludo' and "max_players" not in match:
                effective_max = 4

            # Atomic join loop
            assigned_role = None
            req_role = getattr(match_req, 'requested_role', None)

            for _ in range(3):
                # Double check to prevent same user from taking multiple slots
                for p in range(1, 5):
                    if match.get(f"player{p}_id") == user.user_id:
                        assigned_role = f"player{p}"; break
                if assigned_role: break

                role = None
                p_idx = 1
                
                # Priority: if a specific role was requested and is empty
                if req_role and req_role.startswith("player") and not match.get(f"{req_role}_id"):
                    # Basic bounds check (e.g. don't join player4 if max_players is 2)
                    r_num = int(req_role.replace("player", ""))
                    if r_num <= effective_max:
                        role = req_role
                        p_idx = r_num

                # Fallback: Seek the first truly empty slot
                if not role:
                    for p in range(1, effective_max + 1):
                        if not match.get(f"player{p}_id"):
                            role = f"player{p}"; p_idx = p
                            break
                
                if not role: raise HTTPException(400, "Complet")
                
                up_data = {f"{role}_id": user.user_id, f"{role}_name": user.name, f"{role}_picture": user.picture}
                # Do NOT set status here - we'll set it after verifying all slots are filled
                
                res = await db.duo_matches.update_one({"match_id": match_id, f"{role}_id": None}, {"$set": up_data})
                if res.modified_count > 0:
                    assigned_role = role; break
                else:
                    match = await db.duo_matches.find_one({"match_id": match_id}, {"_id": 0})
            
            if not assigned_role: raise HTTPException(400, "Erreur join")

            # Re-fetch to get the latest match state after the join
            updated_match = await db.duo_matches.find_one({"match_id": match_id}, {"_id": 0})
            real_max = updated_match.get("max_players", 2)
            
            # Count how many slots are now filled
            filled_slots = sum(1 for p in range(1, real_max + 1) if updated_match.get(f"player{p}_id"))
            all_filled = filled_slots >= real_max
            
            # Only mark ready when ALL players have joined
            if all_filled:
                await db.duo_matches.update_one({"match_id": match_id}, {"$set": {"status": "ready"}})
            
            return {
                "match_id": match_id, "role": assigned_role, 
                "status": "ready" if all_filled else "waiting",
                "user_id": user.user_id, "mode_id": match.get("mode_id"), 
                "max_players": real_max,
                "current_state": {"game_data": updated_match.get("game_data"), "found_words": updated_match.get("found_words", []), "history": updated_match.get("history", [])}
            }
        else:
            raise HTTPException(status_code=404, detail="Match non trouvé")
    
    friend_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    match = {
        "match_id": f"duo_{uuid.uuid4().hex[:12]}",
        "friend_code": friend_code,
        "mode_id": match_req.mode_id,
        "max_players": max_players,
        "player1_id": user.user_id, "player1_name": user.name, "player1_picture": user.picture, "player1_score": 0, "player1_answers": [],
        "player2_id": None, "player2_name": None, "player2_picture": None, "player2_score": 0, "player2_answers": [],
        "player3_id": None, "player3_name": None, "player3_picture": None, "player3_score": 0, "player3_answers": [],
        "player4_id": None, "player4_name": None, "player4_picture": None, "player4_score": 0, "player4_answers": [],
        "status": "waiting", "current_question": 0, "questions": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.duo_matches.insert_one(match)
    
    return {"match_id": match["match_id"], "friend_code": friend_code, "role": "player1", "status": "waiting", "user_id": user.user_id, "max_players": max_players}


@api_router.get("/duo/match/{match_id}")
async def get_match_status(match_id: str, request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    match = await db.duo_matches.find_one({"match_id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match non trouvé")
    
    # Check if user is part of the match
    role = None
    for i in range(1, 5):
        if user.user_id == match.get(f"player{i}_id"):
            role = f"player{i}"
            break
    
    if not role:
        raise HTTPException(status_code=403, detail="Vous ne faites pas partie de ce match")
        
    return {
        "match_id": match_id,
        "role": role,
        "status": match.get("status"),
        "mode_id": match.get("mode_id"),
        "max_players": match.get("max_players", 2),
        "user_id": user.user_id,
        "current_state": {
            "game_data": match.get("game_data"),
            "found_words": match.get("found_words", []),
            "history": match.get("history", [])
        }
    }

# ── Duo Static Routes (BEFORE dynamic) ──────────────────────────────
@api_router.get("/duo/history")
async def get_duo_history(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    if not user.is_premium:
        raise HTTPException(status_code=403, detail="Fonctionnalité Premium")
    matches = await db.duo_matches.find(
        {
            "$or": [
                {"player1_id": user.user_id}, 
                {"player2_id": user.user_id},
                {"player3_id": user.user_id},
                {"player4_id": user.user_id}
            ], 
            "status": "completed"
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    return matches

@api_router.get("/duo/stats")
async def get_duo_stats(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    total = await db.duo_matches.count_documents({
        "$or": [
            {"player1_id": user.user_id}, 
            {"player2_id": user.user_id},
            {"player3_id": user.user_id},
            {"player4_id": user.user_id}
        ], 
        "status": "completed"
    })
    wins = await db.duo_matches.count_documents({"winner_id": user.user_id})
    leaderboard_entry = await db.duo_leaderboard.find_one({"user_id": user.user_id}, {"_id": 0})
    mmr = leaderboard_entry.get("mmr", 1000) if leaderboard_entry else 1000
    return {"total_matches": total, "wins": wins, "losses": total - wins, "mmr": mmr, "win_rate": round(wins / total * 100, 1) if total > 0 else 0}

@api_router.get("/duo/leaderboard")
async def get_duo_leaderboard():
    leaderboard = await db.duo_leaderboard.find({}, {"_id": 0}).sort("mmr", -1).to_list(50)
    return leaderboard

@api_router.get("/duo/active-matches")
async def get_active_matches(request: Request):
    # Include matches that are playing and have either a second player or are AI matches
    matches = await db.duo_matches.find(
        {
            "status": {"$in": ["ready", "playing"]},
            "$or": [
                {"player2_id": {"$ne": None}},
                {"player2_id": "ia"}, # Redundant but safe
                {"is_solo": True}
            ]
        },
        {"_id": 0, "match_id": 1, "player1_name": 1, "player2_name": 1, "player1_score": 1, "player2_score": 1, "current_question": 1, "status": 1, "mode_id": 1, "is_solo": 1}
    ).to_list(100)
    
    active_live_matches = []
    for match in matches:
        match_id = match["match_id"]
        # Ensure players have active websocket connections
        connected_players = [p for p in duo_rooms.get(match_id, {}).values() if p.get("role") in ["player1", "player2", "player"]]
        
        # If it's a solo/AI match, we only need 1 player connected
        if match.get("is_solo"):
            if len(connected_players) >= 1:
                active_live_matches.append(match)
        # If it's a duo match, we need both
        elif len(connected_players) >= 2:
            active_live_matches.append(match)
            
    return active_live_matches[:20]

# Dynamic route AFTER statics
@api_router.get("/duo/{match_id}")
async def get_duo_match(match_id: str):
    match = await db.duo_matches.find_one({"match_id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match non trouvé")
    return match

# ── Group Mode (Kahoot-style) ────────────────────────────────────────
@api_router.post("/group/create")
async def create_group_session(request: Request, session_req: CreateGroupSessionRequest, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    pin_code = ''.join(random.choices(string.digits, k=6))
    while await db.group_sessions.find_one({"pin_code": pin_code, "active": True}):
        pin_code = ''.join(random.choices(string.digits, k=6))
    
    session = {
        "session_id": f"group_{uuid.uuid4().hex[:12]}",
        "pin_code": pin_code,
        "host_id": user.user_id,
        "host_name": user.name,
        "name": session_req.name,
        "category": session_req.category,
        "num_questions": session_req.num_questions,
        "players": [],
        "questions": [],
        "active": True,
        "started": False,
        "current_question": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.group_sessions.insert_one(session)
    return {"session_id": session["session_id"], "pin_code": pin_code}

@api_router.post("/group/join")
async def join_group_session(request: Request, join_req: JoinGroupRequest, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    session = await db.group_sessions.find_one({"pin_code": join_req.pin_code, "active": True}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    if session.get("started"):
        raise HTTPException(status_code=400, detail="Session déjà commencée")
    
    player = {"user_id": user.user_id, "name": join_req.player_name, "picture": user.picture, "score": 0, "joined_at": datetime.now(timezone.utc).isoformat()}
    await db.group_sessions.update_one({"pin_code": join_req.pin_code}, {"$push": {"players": player}})
    return {"session_id": session["session_id"], "message": "Rejoint"}

@api_router.get("/group/{session_id}")
async def get_group_session(session_id: str, request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    session = await db.group_sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    return session

@api_router.post("/group/{session_id}/start")
async def start_group_session(session_id: str, request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    session = await db.group_sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    if session["host_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Seul l'hôte peut démarrer")
    
    all_q = get_quiz_vrai_faux("fr").get("statements", []) + get_quiz_vrai_faux("en").get("statements", [])
    random.shuffle(all_q)
    questions = all_q[:session.get("num_questions", 10)]
    await db.group_sessions.update_one({"session_id": session_id}, {"$set": {"started": True, "questions": questions, "current_question": 0}})
    await sio.emit("group_started", {"session_id": session_id, "total_questions": len(questions)}, room=session_id)
    return {"message": "Session démarrée", "total_questions": len(questions)}

@api_router.post("/group/{session_id}/next")
async def next_group_question(session_id: str, request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    session = await db.group_sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not session or session["host_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    q_idx = session.get("current_question", 0)
    questions = session.get("questions", [])
    if q_idx >= len(questions):
        await sio.emit("group_finished", {"session_id": session_id, "players": session.get("players", [])}, room=session_id)
        return {"finished": True}
    
    q = questions[q_idx]
    await db.group_sessions.update_one({"session_id": session_id}, {"$set": {"current_question": q_idx + 1}})
    await sio.emit("group_question", {"question_index": q_idx, "text": q["text"], "total": len(questions)}, room=session_id)
    return {"question_index": q_idx, "text": q["text"]}

# ── Tournaments ──────────────────────────────────────────────────────
@api_router.post("/tournaments/create")
async def create_tournament(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    body = await request.json()
    name = body.get("name", "Tournoi")
    max_players = body.get("max_players", 16)
    
    tournament = {
        "tournament_id": f"tour_{uuid.uuid4().hex[:12]}",
        "name": name,
        "organizer_id": user.user_id,
        "organizer_name": user.name,
        "start_date": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        "max_players": max_players,
        "status": "registration",
        "participants": [],
        "brackets": [],
        "current_round": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tournaments.insert_one(tournament)
    return {"tournament_id": tournament["tournament_id"], "message": "Tournoi créé"}

@api_router.post("/tournaments/{tournament_id}/register")
async def register_tournament(tournament_id: str, request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    tournament = await db.tournaments.find_one({"tournament_id": tournament_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournoi non trouvé")
    if tournament["status"] != "registration":
        raise HTTPException(status_code=400, detail="Inscriptions fermées")
    if any(p["user_id"] == user.user_id for p in tournament["participants"]):
        raise HTTPException(status_code=400, detail="Déjà inscrit")
    if len(tournament["participants"]) >= tournament.get("max_players", 16):
        raise HTTPException(status_code=400, detail="Tournoi complet")
    
    await db.tournaments.update_one({"tournament_id": tournament_id}, {"$push": {"participants": {"user_id": user.user_id, "name": user.name, "picture": user.picture, "registered_at": datetime.now(timezone.utc).isoformat()}}})
    return {"message": "Inscription réussie", "participants_count": len(tournament["participants"]) + 1}

@api_router.get("/tournaments/active")
async def get_active_tournaments():
    tournaments = await db.tournaments.find({"status": {"$in": ["registration", "ongoing"]}}, {"_id": 0}).sort("start_date", 1).to_list(20)
    return tournaments

@api_router.get("/tournaments/{tournament_id}")
async def get_tournament_detail(tournament_id: str):
    tournament = await db.tournaments.find_one({"tournament_id": tournament_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournoi non trouvé")
    return tournament

@api_router.post("/tournaments/{tournament_id}/start")
async def start_tournament(tournament_id: str, request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    tournament = await db.tournaments.find_one({"tournament_id": tournament_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournoi non trouvé")
    if tournament["organizer_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Seul l'organisateur peut démarrer")
    if tournament["status"] != "registration":
        raise HTTPException(status_code=400, detail="Tournoi déjà démarré")
    if len(tournament["participants"]) < 2:
        raise HTTPException(status_code=400, detail="Minimum 2 participants")
    
    participants = tournament["participants"][:]
    random.shuffle(participants)
    if len(participants) % 2 != 0:
        participants.append({"user_id": "BYE", "name": "BYE", "picture": None})
    
    matches = []
    for i in range(0, len(participants), 2):
        matches.append({
            "match_id": f"tm_{uuid.uuid4().hex[:8]}",
            "round": 1,
            "player1": participants[i], "player2": participants[i + 1],
            "winner": participants[i]["user_id"] if participants[i + 1]["user_id"] == "BYE" else None,
            "player1_score": 0, "player2_score": 0,
            "status": "completed" if participants[i + 1]["user_id"] == "BYE" else "pending"
        })
    
    await db.tournaments.update_one({"tournament_id": tournament_id}, {"$set": {"status": "ongoing", "brackets": matches, "current_round": 1}})
    return {"message": "Tournoi démarré", "round": 1, "matches": len(matches)}

@api_router.post("/tournaments/{tournament_id}/report")
async def report_match_result(tournament_id: str, request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    body = await request.json()
    match_id = body.get("match_id")
    winner_id = body.get("winner_id")
    p1_score = body.get("player1_score", 0)
    p2_score = body.get("player2_score", 0)
    
    tournament = await db.tournaments.find_one({"tournament_id": tournament_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournoi non trouvé")
    
    brackets = tournament["brackets"]
    updated = False
    for m in brackets:
        if m["match_id"] == match_id and m["status"] == "pending":
            m["winner"] = winner_id
            m["player1_score"] = p1_score
            m["player2_score"] = p2_score
            m["status"] = "completed"
            updated = True
            break
    
    if not updated:
        raise HTTPException(status_code=400, detail="Match non trouvé ou déjà terminé")
    
    current_round = tournament["current_round"]
    round_matches = [m for m in brackets if m["round"] == current_round]
    all_done = all(m["status"] == "completed" for m in round_matches)
    new_status = tournament["status"]
    
    if all_done:
        winners = [m["player1"] if m["player1"]["user_id"] == m["winner"] else m["player2"] for m in round_matches]
        if len(winners) == 1:
            new_status = "completed"
            await db.tournaments.update_one({"tournament_id": tournament_id}, {"$set": {"champion": winners[0], "completed_at": datetime.now(timezone.utc).isoformat()}})
        else:
            if len(winners) % 2 != 0:
                winners.append({"user_id": "BYE", "name": "BYE", "picture": None})
            new_round = current_round + 1
            for i in range(0, len(winners), 2):
                brackets.append({
                    "match_id": f"tm_{uuid.uuid4().hex[:8]}", "round": new_round,
                    "player1": winners[i], "player2": winners[i + 1],
                    "winner": winners[i]["user_id"] if winners[i + 1]["user_id"] == "BYE" else None,
                    "player1_score": 0, "player2_score": 0,
                    "status": "completed" if winners[i + 1]["user_id"] == "BYE" else "pending"
                })
            current_round = new_round
    
    await db.tournaments.update_one({"tournament_id": tournament_id}, {"$set": {"brackets": brackets, "status": new_status, "current_round": current_round}})
    return {"message": "Résultat enregistré", "tournament_status": new_status}

# ── Achievements ─────────────────────────────────────────────────────
@api_router.get("/achievements")
async def get_achievements(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    all_achievements = await db.achievements.find({}, {"_id": 0}).to_list(100)
    user_achievements = await db.user_achievements.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    earned_ids = {ua["achievement_id"] for ua in user_achievements}
    for achievement in all_achievements:
        achievement["earned"] = achievement["achievement_id"] in earned_ids
        if achievement["earned"]:
            user_ach = next(ua for ua in user_achievements if ua["achievement_id"] == achievement["achievement_id"])
            achievement["earned_at"] = user_ach.get("earned_at")
    return all_achievements

@api_router.post("/achievements/check")
async def check_achievements(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    all_achievements = await db.achievements.find({}, {"_id": 0}).to_list(100)
    user_achievements = await db.user_achievements.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    earned_ids = {ua["achievement_id"] for ua in user_achievements}
    newly_earned = []
    for achievement in all_achievements:
        if achievement["achievement_id"] in earned_ids:
            continue
        condition_met = False
        if achievement["condition_type"] == "level":
            condition_met = user.level >= achievement["condition_value"]
        elif achievement["condition_type"] == "games_played":
            games_count = await db.game_sessions.count_documents({"user_id": user.user_id, "completed": True})
            condition_met = games_count >= achievement["condition_value"]
        elif achievement["condition_type"] == "category_master":
            category_games = await db.game_sessions.count_documents({"user_id": user.user_id, "completed": True})
            condition_met = category_games >= achievement["condition_value"]
        if condition_met:
            await db.user_achievements.insert_one({"user_id": user.user_id, "achievement_id": achievement["achievement_id"], "earned_at": datetime.now(timezone.utc).isoformat()})
            newly_earned.append(achievement)
    return {"newly_earned": newly_earned, "count": len(newly_earned)}

# ── Socket.IO Events ────────────────────────────────────────────────
@sio.event
async def connect(sid, environ):
    pass

@sio.event
async def disconnect(sid):
    # Cleanup duo_rooms
    for match_id in list(duo_rooms.keys()):
        if sid in duo_rooms[match_id]:
            role = duo_rooms[match_id][sid].get("role")
            user_id = duo_rooms[match_id][sid].get("user_id")
            del duo_rooms[match_id][sid]
            
            if role and role.startswith("player"):
                await sio.emit("opponent_disconnected", {"role": role, "user_id": user_id}, room=match_id)

            if role == "spectator":
                spectators = [v for v in duo_rooms.get(match_id, {}).values() if v.get("role") == "spectator"]
                await sio.emit("spectator_count", {"count": len(spectators)}, room=match_id)
            
            # If room is empty, optionally cleanup
            if not duo_rooms[match_id]:
                del duo_rooms[match_id]

@sio.event
async def join_duo_room(sid, data):
    match_id = data.get("match_id")
    user_id = data.get("user_id")
    role = data.get("role", "player")

    match = await db.duo_matches.find_one({"match_id": match_id}, {"_id": 0})
    if not match:
        logging.warning(f"Join failed: Match {match_id} not found")
        return

    # Role verification: find the actual slot for this user
    actual_role = "spectator"
    for i in range(1, 5):
        if match.get(f"player{i}_id") == user_id:
            actual_role = f"player{i}"
            break
    
    
    # If the client claimed a role but we found a different one (or they are spectator)
    if role.startswith("player") and actual_role != role:
        role = actual_role

    await sio.enter_room(sid, match_id)
    duo_rooms.setdefault(match_id, {})[sid] = {"user_id": user_id, "role": role}
    
    await sio.emit("joined_room", {"match_id": match_id, "user_id": user_id, "role": role}, room=sid)
    
    # Broadcast current lobby state (who is in which slot according to DB)
    players_in_lobby = []
    for i in range(1, 5):
        pid = match.get(f"player{i}_id")
        if pid:
            players_in_lobby.append({
                "role": f"player{i}",
                "name": match.get(f"player{i}_name"),
                "picture": match.get(f"player{i}_picture"),
                "user_id": pid
            })
            
    # Robust max_players: always read from DB, never guess
    max_p = match.get("max_players") or 2
        
    await sio.emit("lobby_update", {"match_id": match_id, "players": players_in_lobby, "max_players": max_p}, room=match_id)

    # Signal 'both_ready' ONLY when all required unique players are connected
    unique_users = {v["user_id"] for v in duo_rooms.get(match_id, {}).values() if v["role"].startswith("player")}
    if len(unique_users) >= max_p:
        await sio.emit("both_ready", {"match_id": match_id}, room=match_id)

@sio.event
async def rejoin_duo_room(sid, data):
    match_id = data.get("match_id")
    user_id = data.get("user_id")
    role = data.get("role")
    
    match = await db.duo_matches.find_one({"match_id": match_id}, {"_id": 0})
    if not match: return

    # Role verification
    actual_role = "spectator"
    for i in range(1, 5):
        if match.get(f"player{i}_id") == user_id:
            actual_role = f"player{i}"
            break
    
    if role and role.startswith("player") and actual_role != role:
        role = actual_role

    await sio.enter_room(sid, match_id)
    duo_rooms.setdefault(match_id, {})[sid] = {"user_id": user_id, "role": role}
    
    await sio.emit("player_rejoined", {"role": role, "user_id": user_id}, room=match_id, skip_sid=sid)

    # Broadcast current lobby state
    match = await db.duo_matches.find_one({"match_id": match_id}, {"_id": 0})
    if match:
        players_in_lobby = []
        for i in range(1, 5):
            pid = match.get(f"player{i}_id")
            if pid:
                players_in_lobby.append({
                    "role": f"player{i}",
                    "name": match.get(f"player{i}_name"),
                    "picture": match.get(f"player{i}_picture"),
                    "user_id": pid
                })
        max_p = match.get("max_players") or 2
        await sio.emit("lobby_update", {"match_id": match_id, "players": players_in_lobby, "max_players": max_p}, room=match_id)

    # Unique-ify by user_id to prevent multiple tabs from counting as multiple players
    unique_users = {v["user_id"] for v in duo_rooms.get(match_id, {}).values() if v["role"].startswith("player")}
    max_p = match.get("max_players") or 2
        
    if len(unique_users) >= max_p:
        await sio.emit("both_ready", {"match_id": match_id}, room=match_id)

@sio.event
async def force_start_match(sid, data):
    match_id = data.get("match_id")
    match = await db.duo_matches.find_one({"match_id": match_id})
    if not match: return
    
    # Only player1 (host) can force start
    room_info = duo_rooms.get(match_id, {}).get(sid)
    if not room_info or room_info["role"] != "player1":
        return
        
    unique_users = {v["user_id"] for v in duo_rooms.get(match_id, {}).values() if v["role"].startswith("player")}
    max_p = match.get("max_players") or 2
        
    if len(unique_users) >= max_p:
        await sio.emit("both_ready", {"match_id": match_id}, room=match_id)


@sio.event
async def spectate_match(sid, data):
    match_id = data.get("match_id")
    user_id = data.get("user_id", "anonymous")
    user_name = data.get("user_name", "Spectateur")
    
    await sio.enter_room(sid, match_id)
    duo_rooms.setdefault(match_id, {})[sid] = {"user_id": user_id, "role": "spectator", "name": user_name}
    
    # Get current state
    match = await db.duo_matches.find_one({"match_id": match_id}, {"_id": 0})
    likes = interaction_manager.get_likes(match_id)
    comments = interaction_manager.get_comments(match_id)
    
    await sio.emit("spectator_joined", {
        "match_id": match_id, 
        "likes": likes,
        "comments": comments,
        "current_state": match
    }, room=sid)

    spectators = [v for v in duo_rooms.get(match_id, {}).values() if v.get("role") == "spectator"]
    await sio.emit("spectator_count", {"count": len(spectators)}, room=match_id)

@sio.event
async def game_like(sid, data):
    match_id = data.get("match_id")
    player_role = data.get("player_role") # player1, player2 or None
    new_count = interaction_manager.add_like(match_id, player_role)
    await sio.emit("like_update", {"match_id": match_id, "player_role": player_role, "count": new_count}, room=match_id)

@sio.event
async def game_comment(sid, data):
    match_id = data.get("match_id")
    user_id = data.get("user_id")
    user_name = data.get("user_name")
    text = data.get("text")
    if not text: return
    comment = interaction_manager.add_comment(match_id, user_id, user_name, text)
    await sio.emit("new_comment", {"match_id": match_id, "comment": comment}, room=match_id)

@sio.event
async def game_reaction(sid, data):
    match_id = data.get("match_id")
    reaction_type = data.get("reaction_type")
    interaction_manager.record_reaction(match_id, reaction_type)
    await sio.emit("new_reaction", {"match_id": match_id, "reaction_type": reaction_type, "sid": sid}, room=match_id)

@sio.event
async def player_ready(sid, data):
    match_id = data.get("match_id")
    match = await db.duo_matches.find_one({"match_id": match_id}, {"_id": 0})
    if not match:
        return
    
    mode_id = match.get("mode_id")
    
    if mode_id == "mots_caches":
        if not match.get("game_data"):
            # Initialize grid using the same logic as routes
            from routes.games_routes import generate_game_data
            game_data = await generate_game_data(mode_id, "fr", match.get("config", {}))
            await db.duo_matches.update_one({"match_id": match_id}, {"$set": {"game_data": game_data, "status": "playing"}})
            match["game_data"] = game_data
        
        await sio.emit("game_start", {"match_id": match_id, "game_data": match["game_data"]}, room=match_id)
        return

    if not match.get("questions"):
        questions = get_quiz_vrai_faux("fr").get("statements", [])[:5]
        formatted = [{"text": q["text"], "options": ["Vrai", "Faux"], "correct_answer": 0 if q["answer"] else 1} for q in questions]
        await db.duo_matches.update_one({"match_id": match_id}, {"$set": {"questions": formatted, "status": "playing"}})
        match["questions"] = formatted
    
    if match.get("questions"):
        q = match["questions"][0]
        await sio.emit("new_question", {"question_index": 0, "text": q["text"], "options": q["options"], "total_questions": len(match["questions"])}, room=match_id)

@sio.event
async def submit_answer(sid, data):
    match_id = data.get("match_id")
    answer_index = data.get("answer_index")
    user_id = data.get("user_id")
    time_taken = data.get("time_taken", 10)
    
    match = await db.duo_matches.find_one({"match_id": match_id}, {"_id": 0})
    if not match:
        return
    
    q_idx = match.get("current_question", 0)
    questions = match.get("questions", [])
    if q_idx >= len(questions):
        return
    
    is_correct = answer_index == questions[q_idx].get("correct_answer")
    points = max(100, 500 - int(time_taken * 50)) if is_correct else 0
    
    role = "player1" if user_id == match.get("player1_id") else "player2"
    update = {f"{role}_score": match.get(f"{role}_score", 0) + points}
    match[f"{role}_score"] = update[f"{role}_score"]
    
    answers_key = f"{role}_answers"
    answers = match.get(answers_key, [])
    answers.append({"question_index": q_idx, "answer": answer_index, "correct": is_correct, "points": points, "time": time_taken})
    update[answers_key] = answers
    
    await db.duo_matches.update_one({"match_id": match_id}, {"$set": update})
    
    await sio.emit("answer_received", {"user_id": user_id, "role": role, "points": points, "is_correct": is_correct, "question_index": q_idx}, room=match_id)
    
    max_p = match.get("max_players", 2)
    all_players_answered = True
    round_results = {"question_index": q_idx, "correct_answer": questions[q_idx].get("correct_answer")}
    
    for i in range(1, max_p + 1):
        pid = match.get(f"player{i}_id")
        if not pid: continue
        
        # Check if this player has answered this question
        p_ans = answers if role == f"player{i}" else match.get(f"player{i}_answers", [])
        if not any(a["question_index"] == q_idx for a in p_ans):
            all_players_answered = False
            break
        
        round_results[f"player{i}"] = {"total_score": match.get(f"player{i}_score", 0)}

    if all_players_answered:
        await sio.emit("round_results", round_results, room=match_id)
        
        next_q = q_idx + 1
        await db.duo_matches.update_one({"match_id": match_id}, {"$set": {"current_question": next_q}})
        
        if next_q >= len(questions):
            # Determine winner(s) among all players
            player_scores = []
            for i in range(1, max_p + 1):
                pid = match.get(f"player{i}_id")
                if pid:
                    player_scores.append({
                        "role": f"player{i}",
                        "id": pid,
                        "score": match.get(f"player{i}_score", 0),
                        "name": match.get(f"player{i}_name")
                    })
            
            # Sort by score descending
            player_scores.sort(key=lambda x: x["score"], reverse=True)
            
            highest_score = player_scores[0]["score"]
            winners = [p for p in player_scores if p["score"] == highest_score]
            
            is_draw = len(winners) > 1
            winner_role = winners[0]["role"] if not is_draw else "draw"
            winner_id = winners[0]["id"] if not is_draw else None
            
            await db.duo_matches.update_one(
                {"match_id": match_id}, 
                {"$set": {"status": "completed", "winner": winner_role, "winner_id": winner_id}}
            )
            
            # Update MMR and Results for all participants
            for p in player_scores:
                pid = p["id"]
                is_this_winner = not is_draw and pid == winner_id
                
                await db.duo_leaderboard.update_one(
                    {"user_id": pid},
                    {"$setOnInsert": {"user_id": pid, "mmr": 1000, "wins": 0, "losses": 0, "draws": 0, "name": p["name"]}},
                    upsert=True
                )
                
                if is_draw:
                    await db.duo_leaderboard.update_one({"user_id": pid}, {"$inc": {"draws": 1}})
                elif is_this_winner:
                    await db.duo_leaderboard.update_one({"user_id": pid}, {"$inc": {"mmr": 25, "wins": 1}})
                else:
                    await db.duo_leaderboard.update_one({"user_id": pid}, {"$inc": {"mmr": -15, "losses": 1}})
            
            # Emit final results
            final_results = {"winner": winner_role}
            for p in player_scores:
                final_results[f"{p['role']}_score"] = p["score"]
                
            await sio.emit("game_end", final_results, room=match_id)
            
            # Persist social metrics from Redis to MongoDB
            social_likes = interaction_manager.get_likes(match_id)
            social_comments = interaction_manager.get_comments(match_id)
            await db.duo_matches.update_one(
                {"match_id": match_id},
                {"$set": {
                    "social_metrics": {
                        "likes": social_likes,
                        "comments": social_comments
                    }
                }}
            )
            # interaction_manager.cleanup(match_id) # Optional: clear Redis cache
            
            await sio.emit("game_end", {"winner": winner, "player1_score": p1_score, "player2_score": p2_score}, room=match_id)
        else:
            import asyncio
            await asyncio.sleep(2)
            q = questions[next_q]
            await sio.emit("new_question", {"question_index": next_q, "text": q["text"], "options": q["options"], "total_questions": len(questions)}, room=match_id)

@sio.event
async def send_emoji(sid, data):
    match_id = data.get("match_id")
    await sio.emit("receive_reaction", data, room=match_id)

@sio.event
async def game_move(sid, data):
    match_id = data.get("match_id")
    await sio.emit("opponent_move", data, room=match_id, skip_sid=sid)
    
    if "boardState" in data:
        update_fields = {"game_data.boardState": data["boardState"]}
        if "turnState" in data:
            update_fields["game_data.turnState"] = data["turnState"]
            
        await db.duo_matches.update_one(
            {"match_id": match_id},
            {"$set": update_fields}
        )
        
    if "type" in data and data["type"] == "ludo_state":
        winner_color = data.get("winner")
        update_fields = {
            "game_data.pieces": data.get("pieces"),
            "game_data.turn": data.get("turn"),
            "game_data.dice": data.get("dice"),
            "game_data.rolled": data.get("rolled"),
            "game_data.winner": winner_color
        }
        
        await db.duo_matches.update_one({"match_id": match_id}, {"$set": update_fields})
        
        if winner_color:
            # End of game detected for Ludo
            match = await db.duo_matches.find_one({"match_id": match_id}, {"_id": 0})
            if match and match.get("status") != "completed":
                max_p = match.get("max_players", 2)
                # Map color back to role (Sync with Ludo.jsx ROLE_COLOR)
                ROLE_MAP = {2: {'R':'player1', 'B':'player2'},
                            3: {'R':'player1', 'B':'player2', 'G':'player3'},
                            4: {'R':'player1', 'G':'player2', 'Y':'player3', 'B':'player4'}}
                
                winner_role = ROLE_MAP.get(max_p, ROLE_MAP[2]).get(winner_color)
                winner_id = match.get(f"{winner_role}_id") if winner_role else None
                
                if winner_id:
                    await db.duo_matches.update_one(
                        {"match_id": match_id}, 
                        {"$set": {"status": "completed", "winner": winner_role, "winner_id": winner_id}}
                    )
                    
                    # Reward all players
                    for i in range(1, max_p + 1):
                        pid = match.get(f"player{i}_id")
                        if pid:
                            is_this_win = (pid == winner_id)
                            await db.duo_leaderboard.update_one(
                                {"user_id": pid},
                                {"$setOnInsert": {"user_id": pid, "mmr": 1000, "wins": 0, "losses": 0, "draws": 0, "name": match.get(f"player{i}_name")}},
                                upsert=True
                            )
                            if is_this_win:
                                await db.duo_leaderboard.update_one({"user_id": pid}, {"$inc": {"mmr": 25, "wins": 1}})
                            else:
                                await db.duo_leaderboard.update_one({"user_id": pid}, {"$inc": {"mmr": -15, "losses": 1}})
                                
                    await sio.emit("game_end", {"winner": winner_role, "winner_id": winner_id}, room=match_id)
    
    if "wordFound" in data:
        # Save found word and its cells to the match record for spectators
        await db.duo_matches.update_one(
            {"match_id": match_id},
            {
                "$push": {
                    "found_words": {
                        "word": data["wordFound"],
                        "cells": data["selectedCells"],
                        "role": data.get("role")
                    }
                }
            }
        )

# WebRTC Signaling
@sio.event
async def webrtc_offer(sid, data):
    match_id = data.get("match_id")
    target_sid = data.get("target_sid")
    data["from_sid"] = sid
    if target_sid:
        await sio.emit("webrtc_offer", data, room=target_sid)
    else:
        await sio.emit("webrtc_offer", data, room=match_id, skip_sid=sid)

@sio.event
async def webrtc_answer(sid, data):
    match_id = data.get("match_id")
    target_sid = data.get("target_sid")
    data["from_sid"] = sid
    if target_sid:
        await sio.emit("webrtc_answer", data, room=target_sid)
    else:
        await sio.emit("webrtc_answer", data, room=match_id, skip_sid=sid)

@sio.event
async def webrtc_ice_candidate(sid, data):
    match_id = data.get("match_id")
    target_sid = data.get("target_sid")
    data["from_sid"] = sid
    if target_sid:
        await sio.emit("webrtc_ice_candidate", data, room=target_sid)
    else:
        await sio.emit("webrtc_ice_candidate", data, room=match_id, skip_sid=sid)

@sio.event
async def webrtc_ready(sid, data):
    match_id = data.get("match_id")
    user_id = data.get("user_id")
    
    # Auto-register the sid if it joined the room but wasn't tracked yet
    if match_id not in duo_rooms:
        duo_rooms[match_id] = {}
        
    room_data = duo_rooms[match_id]
    
    if sid not in room_data:
        match = await db.duo_matches.find_one({"match_id": match_id}, {"_id": 0})
        if match:
            role = "spectator"
            for i in range(1, 5):
                if user_id == match.get(f"player{i}_id"):
                    role = f"player{i}"
                    break
            
            if role == "spectator":
                return # Only players trigger start_webrtc for now
            
            room_data[sid] = {"user_id": user_id, "role": role}
            await sio.enter_room(sid, match_id)
            # Re-fetch match to ensure we have latest max_players
            max_p = match.get("max_players") or 2
        else:
            return
    else:
        # If already tracked, we still need max_players for the check
        match = await db.duo_matches.find_one({"match_id": match_id}, {"max_players": 1})
        max_p = match.get("max_players") or 2
    
    room_data[sid]["webrtc_ready"] = True
    
    ready_players = [v for v in room_data.values() if v.get("webrtc_ready") and v.get("role", "").startswith("player")]
    
    if len(ready_players) >= max_p:
        # Collect all player SIDs
        player_sids = {}
        for k, v in room_data.items():
            r = v.get("role")
            if r and r.startswith("player"):
                player_sids[f"{r}_sid"] = k
        
        await sio.emit("start_webrtc", {
            "match_id": match_id,
            **player_sids
        }, room=match_id)

@sio.event
async def spectator_voice_ready(sid, data):
    match_id = data.get("match_id")
    # Notify players that a spectator is ready to receive audio
    await sio.emit("spectator_voice_ready", {"match_id": match_id, "spectator_sid": sid}, room=match_id)

# Group Socket.IO events
@sio.event
async def join_group_room(sid, data):
    session_id = data.get("session_id")
    await sio.enter_room(sid, session_id)
    await sio.emit("joined_group", {"session_id": session_id}, room=sid)

@sio.event
async def group_answer(sid, data):
    session_id = data.get("session_id")
    user_id = data.get("user_id")
    answer = data.get("answer")
    question_index = data.get("question_index")
    
    session = await db.group_sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        return
    
    questions = session.get("questions", [])
    if question_index < len(questions):
        is_correct = answer == questions[question_index].get("answer")
        points = 100 if is_correct else 0
        
        await db.group_sessions.update_one(
            {"session_id": session_id, "players.user_id": user_id},
            {"$inc": {"players.$.score": points}}
        )
        
        # Send result only to the specific player
        await sio.emit("group_answer_result", {"user_id": user_id, "correct": is_correct, "points": points}, room=sid)
        
        # Broadcast updated leaderboard to everyone in the room
        updated = await db.group_sessions.find_one({"session_id": session_id}, {"_id": 0})
        sorted_players = sorted(updated.get("players", []), key=lambda p: p.get("score", 0), reverse=True)
        await sio.emit("group_leaderboard", {"players": sorted_players}, room=session_id)

# ── Middleware & Config ──────────────────────────────────────────────
fastapi_app.include_router(api_router)
fastapi_app.include_router(admin_router, prefix="/api")


# ── Admin: Update Game Mode (name, description, icon, available, difficulty) ───
@fastapi_app.patch("/api/admin/game-modes/{mode_id}")
async def update_game_mode(mode_id: str, request: Request, authorization: Optional[str] = Header(None)):
    """Update any fields of a game mode and broadcast changes to all clients via Socket.IO."""
    from auth import get_admin_user
    await get_admin_user(request, authorization)

    body = await request.json()

    # Only allow whitelisted fields to be updated
    ALLOWED_FIELDS = {"name", "description", "icon", "available", "difficulty", "duration_minutes", "color"}
    updates = {k: v for k, v in body.items() if k in ALLOWED_FIELDS}

    if not updates:
        raise HTTPException(status_code=400, detail="Aucun champ valide fourni")

    result = await db.game_modes.update_one(
        {"mode_id": mode_id},
        {"$set": updates}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Mode de jeu non trouvé")

    # Fetch the full updated document to broadcast to all clients
    updated_mode = await db.game_modes.find_one({"mode_id": mode_id}, {"_id": 0})

    # Broadcast the full updated mode to ALL connected clients in real-time
    await sio.emit("game_mode_updated", updated_mode)

    return {"mode_id": mode_id, "updates": updates, "message": "Mode mis à jour et diffusé en temps réel"}

origins_raw = os.environ.get('CORS_ORIGINS', '')
if not origins_raw or origins_raw == '*':
    # Fallback to local and production domains if not set or set to *
    # Credentials=True is incompatible with * in any case
    allowed_origins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:3001",
        "https://dev-app.dueloo.dikotech.com",
        "https://dev-admin.dueloo.dikotech.com",
        "https://dev-backend.dueloo.dikotech.com",
        "https://app.dueloo.dikotech.com",
        "https://admin.dueloo.dikotech.com",
        "https://backend.dueloo.dikotech.com",
    ]
else:
    allowed_origins = origins_raw.split(',')

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@fastapi_app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Seeding is now handled by backend/scripts/seed_db.py during container entrypoint
    
    # Seed badges (incl. polyglot)
    if await db.badges.count_documents({}) == 0:
        badges = [
            {"badge_id": "badge_neophyte", "name": "Néophyte", "icon": "🌱", "description": "Finish first 5 lessons", "condition_type": "lessons_completed", "condition_value": 5},
            {"badge_id": "badge_berger", "name": "Berger", "icon": "🐑", "description": "Reach level 10", "condition_type": "level", "condition_value": 10},
            {"badge_id": "badge_levite", "name": "Lévite", "icon": "📜", "description": "Reach level 25", "condition_type": "level", "condition_value": 25},
            {"badge_id": "badge_apotre", "name": "Apôtre", "icon": "⭐", "description": "Reach level 50", "condition_type": "level", "condition_value": 50},
            {"badge_id": "badge_polyglotte", "name": "Polyglotte Biblique", "icon": "🌍", "description": "Play 5+ games in FR and EN", "condition_type": "polyglot", "condition_value": 5},
        ]
        await db.badges.insert_many(badges)
        logger.info(f"Seeded {len(badges)} badges")
    else:
        # Ensure polyglot badge exists
        if not await db.badges.find_one({"badge_id": "badge_polyglotte"}):
            await db.badges.insert_one({"badge_id": "badge_polyglotte", "name": "Polyglotte Biblique", "icon": "🌍", "description": "Play 5+ games in FR and EN", "condition_type": "polyglot", "condition_value": 5})
    
    # Seed game modes
    if await db.game_modes.count_documents({}) == 0:
        game_modes = [
            # Quiz et Tests
            {"mode_id": "quiz_qui_a_dit", "category": "Quiz et Tests", "name": "Qui a dit quoi ?", "description": "Attribuez chaque citation à son auteur biblique", "icon": "💬", "difficulty": "moyen", "duration_minutes": 5, "color": "from-blue-400 to-blue-600", "available": True},
            {"mode_id": "quiz_vrai_faux", "category": "Quiz et Tests", "name": "Vrai ou Faux", "description": "Affirmations rapides sur les miracles et événements", "icon": "✓✗", "difficulty": "facile", "duration_minutes": 3, "color": "from-green-400 to-emerald-600", "available": True},
            {"mode_id": "chrono_versets", "category": "Quiz et Tests", "name": "Chrono-Versets", "description": "Complétez un verset le plus vite possible", "icon": "⏱️", "difficulty": "moyen", "duration_minutes": 2, "color": "from-orange-400 to-orange-600", "available": True},
            
            # Jeux de Mots
            {"mode_id": "mots_caches", "category": "Jeux de Mots", "name": "Mots Cachés Bibliques", "description": "Trouvez les noms cachés", "icon": "🔤", "difficulty": "facile", "duration_minutes": 5, "color": "from-purple-400 to-purple-600", "available": True},
            {"mode_id": "anagrammes", "category": "Jeux de Mots", "name": "Anagrammes", "description": "Reconstituez les noms bibliques", "icon": "🔀", "difficulty": "moyen", "duration_minutes": 3, "color": "from-pink-400 to-pink-600", "available": True},
            
            # Strategie et Plateau
            {"mode_id": "echecs", "category": "Strategie et Plateau", "name": "Échecs", "description": "Le roi des jeux de stratégie - Contrôle et tactique", "icon": "♟️", "difficulty": "difficile", "duration_minutes": 20, "color": "from-slate-700 to-slate-900", "available": False},
            {"mode_id": "damier", "category": "Strategie et Plateau", "name": "Damier", "description": "Forcez les captures et créez des chaînes de prises", "icon": "⬛", "difficulty": "moyen", "duration_minutes": 15, "color": "from-gray-600 to-gray-800", "available": False},
            {"mode_id": "puissance4", "category": "Strategie et Plateau", "name": "Puissance 4", "description": "Alignez 4 jetons avant votre adversaire", "icon": "🔴", "difficulty": "facile", "duration_minutes": 5, "color": "from-red-400 to-red-600", "available": False},
            {"mode_id": "morpion", "category": "Strategie et Plateau", "name": "Morpion", "description": "Le classique indémodable du 3x3", "icon": "❌", "difficulty": "facile", "duration_minutes": 2, "color": "from-blue-500 to-blue-700", "available": False},
            {"mode_id": "othello", "category": "Strategie et Plateau", "name": "Othello", "description": "Une minute pour apprendre, une vie pour maîtriser", "icon": "⚫", "difficulty": "moyen", "duration_minutes": 10, "color": "from-emerald-700 to-emerald-900", "available": False},
            {"mode_id": "go", "category": "Strategie et Plateau", "name": "Go", "description": "Contrôlez le territoire dans ce jeu ancestral", "icon": "⚪", "difficulty": "très difficile", "duration_minutes": 30, "color": "from-zinc-400 to-zinc-600", "available": False},
            {"mode_id": "awale", "category": "Strategie et Plateau", "name": "Awalé", "description": "Le jeu de semailles africain", "icon": "🟤", "difficulty": "moyen", "duration_minutes": 10, "color": "from-orange-700 to-amber-900", "available": False},
            {"mode_id": "fanorona", "category": "Strategie et Plateau", "name": "Fanorona", "description": "Stratégie malgache de captures multiples", "icon": "🔶", "difficulty": "difficile", "duration_minutes": 15, "color": "from-orange-400 to-orange-600", "available": False},
            {"mode_id": "zamma", "category": "Strategie et Plateau", "name": "Zamma", "description": "Variante sahélienne intense du damier", "icon": "🔷", "difficulty": "difficile", "duration_minutes": 20, "color": "from-blue-400 to-blue-600", "available": False},
            {"mode_id": "ludo", "category": "Strategie et Plateau", "name": "Ludo", "description": "Le jeu de parcours classique revisité en duel", "icon": "🎲", "difficulty": "facile", "duration_minutes": 10, "color": "from-amber-400 to-orange-600", "available": True},

            # Cartes
            {"mode_id": "uno", "category": "Cartes", "name": "UNO", "description": "Débarrassez-vous de vos cartes au bon moment", "icon": "🎴", "difficulty": "facile", "duration_minutes": 10, "color": "from-red-500 via-yellow-500 to-green-500", "available": False},
            {"mode_id": "belote", "category": "Cartes", "name": "Belote / Coinche", "description": "Jeu de plis en équipe - Stratégie et atouts", "icon": "🂡", "difficulty": "difficile", "duration_minutes": 15, "color": "from-blue-600 to-indigo-800", "available": False},
            {"mode_id": "poker", "category": "Cartes", "name": "Poker", "description": "Bluff, probabilités et psychologie", "icon": "♠️", "difficulty": "difficile", "duration_minutes": 20, "color": "from-gray-800 to-black", "available": False},
            {"mode_id": "bataille", "category": "Cartes", "name": "Bataille", "description": "Le duel de cartes le plus simple", "icon": "🃏", "difficulty": "facile", "duration_minutes": 5, "color": "from-red-700 to-red-900", "available": False},
            {"mode_id": "rami", "category": "Cartes", "name": "Rami", "description": "Formez des suites et des brelans", "icon": "🧩", "difficulty": "moyen", "duration_minutes": 15, "color": "from-cyan-600 to-cyan-800", "available": False},

            # Arcade et Action
            {"mode_id": "snake", "category": "Arcade et Action", "name": "Snake", "description": "Mangez et devenez le plus long possible", "icon": "🐍", "difficulty": "facile", "duration_minutes": 5, "color": "from-green-500 to-green-700", "available": False},
            {"mode_id": "agario", "category": "Arcade et Action", "name": "Agar.io-like", "description": "Mangez les plus petits, fuyez les plus gros", "icon": "⚪", "difficulty": "moyen", "duration_minutes": 5, "color": "from-purple-500 to-indigo-600", "available": False},
            {"mode_id": "course", "category": "Arcade et Action", "name": "Course", "description": "Trajectoire optimale sur piste 2D", "icon": "🏎️", "difficulty": "moyen", "duration_minutes": 3, "color": "from-red-500 to-orange-600", "available": False},
            {"mode_id": "football", "category": "Arcade et Action", "name": "Football 2D", "description": "Marquez contre l'adversaire", "icon": "⚽", "difficulty": "facile", "duration_minutes": 5, "color": "from-green-400 to-emerald-600", "available": False},
            {"mode_id": "combat", "category": "Arcade et Action", "name": "Combat", "description": "Timing et réflexes en duel", "icon": "🥊", "difficulty": "moyen", "duration_minutes": 3, "color": "from-zinc-500 to-zinc-700", "available": False},
            {"mode_id": "tower_defense", "category": "Arcade et Action", "name": "Tower Defense", "description": "Protégez votre château contre les vagues", "icon": " castle", "difficulty": "difficile", "duration_minutes": 15, "color": "from-amber-600 to-amber-800", "available": False},

            # Éducatif
            {"mode_id": "skribbl", "category": "Éducatif", "name": "Skribbl-like", "description": "Dessinez et devinez les mots bibliques", "icon": "🎨", "difficulty": "facile", "duration_minutes": 10, "color": "from-yellow-400 to-orange-500", "available": False},
            {"mode_id": "memory_biblique", "category": "Éducatif", "name": "Memory Biblique", "description": "Trouvez les paires de symboles", "icon": "🧠", "difficulty": "facile", "duration_minutes": 5, "color": "from-teal-400 to-teal-600", "available": True},
            
            # Legacy / Special
            {"mode_id": "la_manne", "category": "Rapidité", "name": "La Manne du Ciel", "description": "Attrapez les bénédictions", "icon": "🍞", "difficulty": "facile", "duration_minutes": 2, "color": "from-yellow-400 to-yellow-600", "available": True},
            {"mode_id": "tri_livres", "category": "Rapidité", "name": "Tri de Livres", "description": "Classez: Ancien vs Nouveau Testament", "icon": "📚", "difficulty": "facile", "duration_minutes": 3, "color": "from-indigo-400 to-indigo-600", "available": True},
            {"mode_id": "labyrinthe_exode", "category": "Logique", "name": "Labyrinthe de l'Exode", "description": "Guidez le peuple vers la Terre Promise", "icon": "🗺️", "difficulty": "moyen", "duration_minutes": 5, "color": "from-amber-400 to-amber-600", "available": True},
            {"mode_id": "brebis_perdue", "category": "Défis Flash", "name": "Trouver la Brebis", "description": "Retrouvez la brebis égarée", "icon": "🐑", "difficulty": "facile", "duration_minutes": 1, "color": "from-lime-400 to-lime-600", "available": True},
            {"mode_id": "multiplier_pains", "category": "Défis Flash", "name": "Multiplier les Pains", "description": "Cliquez vite pour nourrir la foule", "icon": "🍞", "difficulty": "facile", "duration_minutes": 1, "color": "from-rose-400 to-rose-600", "available": True},
            {"mode_id": "blind_test", "category": "Éducatif", "name": "Blind Test des Cantiques", "description": "Reconnaissez les hymnes", "icon": "🎵", "difficulty": "moyen", "duration_minutes": 10, "color": "from-cyan-400 to-cyan-600", "available": False},
            {"mode_id": "voyage_paul", "category": "Arcade et Action", "name": "Le Voyage de Paul", "description": "Suivez les missions de l'apôtre Paul", "icon": "⛵", "difficulty": "difficile", "duration_minutes": 15, "color": "from-violet-400 to-violet-600", "available": False}
        ]

        await db.game_modes.insert_many(game_modes)
        logger.info(f"Seeded {len(game_modes)} game modes")
    
    # Seed achievements
    if await db.achievements.count_documents({}) == 0:
        achievements = [
            {"achievement_id": "ach_first_game", "name": "Premier Pas", "icon": "🎮", "description": "Play your first game", "condition_type": "games_played", "condition_value": 1, "category": "general", "xp_reward": 50},
            {"achievement_id": "ach_10_games", "name": "Joueur Régulier", "icon": "🎯", "description": "Play 10 games", "condition_type": "games_played", "condition_value": 10, "category": "general", "xp_reward": 100},
            {"achievement_id": "ach_50_games", "name": "Vétéran", "icon": "🏆", "description": "Play 50 games", "condition_type": "games_played", "condition_value": 50, "category": "general", "xp_reward": 500},
            {"achievement_id": "ach_level_5", "name": "Disciple Dévoué", "icon": "⭐", "description": "Reach level 5", "condition_type": "level", "condition_value": 5, "category": "progression", "xp_reward": 100},
            {"achievement_id": "ach_level_15", "name": "Serviteur Fidèle", "icon": "✨", "description": "Reach level 15", "condition_type": "level", "condition_value": 15, "category": "progression", "xp_reward": 300},
            {"achievement_id": "badge_premier_duel", "name": "Premier Duel", "icon": "⚔️", "description": "Complete your first duel", "condition_type": "duo_played", "condition_value": 1, "category": "duo", "xp_reward": 100},
        ]
        await db.achievements.insert_many(achievements)
        logger.info(f"Seeded {len(achievements)} achievements")

app = socket_app
