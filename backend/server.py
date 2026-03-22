from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, Header
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import socketio
import os
import logging
import uuid
import httpx
import random
import string
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=False
)

app = FastAPI()
socket_app = socketio.ASGIApp(sio, app, socketio_path='api/socket.io')
api_router = APIRouter(prefix="/api")

STRIPE_API_KEY = os.getenv('STRIPE_API_KEY', 'sk_test_emergent')

PREMIUM_PACKAGES = {
    "1h": {"amount": 2.99, "currency": "usd", "duration_hours": 1, "name": "Pass 1 Heure"},
    "24h": {"amount": 9.99, "currency": "usd", "duration_hours": 24, "name": "Pass 24 Heures"}
}

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    level: int = 1
    xp: int = 0
    lives: int = 5
    coins: int = 0
    is_premium: bool = False
    premium_expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Question(BaseModel):
    model_config = ConfigDict(extra="ignore")
    question_id: str
    book: str
    chapter: int
    text: str
    options: List[str]
    correct_answer: int
    difficulty: str
    explanation: Optional[str] = None

class UserProgress(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    book: str
    level: int
    completed: bool = False
    score: int = 0
    completed_at: Optional[datetime] = None

class Badge(BaseModel):
    model_config = ConfigDict(extra="ignore")
    badge_id: str
    name: str
    icon: str
    description: str
    condition_type: str
    condition_value: int

class UserBadge(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    badge_id: str
    earned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str
    user_id: str
    amount: float
    currency: str
    package_id: str
    payment_status: str
    status: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DailyManna(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    last_played: datetime
    coins_earned: int
    streak: int = 1

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
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    if isinstance(user_doc.get('premium_expires_at'), str):
        user_doc['premium_expires_at'] = datetime.fromisoformat(user_doc['premium_expires_at'])
    
    return User(**user_doc)

@api_router.post("/auth/session")
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
            {"$set": {
                "name": user_data["name"],
                "picture": user_data.get("picture")
            }}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        new_user = User(
            user_id=user_id,
            email=user_data["email"],
            name=user_data["name"],
            picture=user_data.get("picture")
        )
        user_dict = new_user.model_dump()
        user_dict['created_at'] = user_dict['created_at'].isoformat()
        await db.users.insert_one(user_dict)
    
    session_token = user_data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session = UserSession(
        user_id=user_id,
        session_token=session_token,
        expires_at=expires_at
    )
    session_dict = session.model_dump()
    session_dict['expires_at'] = session_dict['expires_at'].isoformat()
    session_dict['created_at'] = session_dict['created_at'].isoformat()
    
    await db.user_sessions.insert_one(session_dict)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

@api_router.get("/auth/me")
async def get_me(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    
    if user.premium_expires_at:
        if user.premium_expires_at.tzinfo is None:
            premium_expires = user.premium_expires_at.replace(tzinfo=timezone.utc)
        else:
            premium_expires = user.premium_expires_at
        
        if premium_expires < datetime.now(timezone.utc):
            await db.users.update_one(
                {"user_id": user.user_id},
                {"$set": {"is_premium": False, "premium_expires_at": None}}
            )
            user.is_premium = False
            user.premium_expires_at = None
    
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response, authorization: Optional[str] = Header(None)):
    token = get_session_token(request, authorization)
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Déconnecté avec succès"}

@api_router.get("/questions/random")
async def get_random_questions(request: Request, authorization: Optional[str] = Header(None), book: Optional[str] = None, difficulty: Optional[str] = None, limit: int = 10):
    user = await get_current_user(request, authorization)
    
    query = {}
    if book:
        query["book"] = book
    if difficulty:
        query["difficulty"] = difficulty
    
    questions = await db.questions.find(query, {"_id": 0}).to_list(limit)
    
    if not questions:
        return []
    
    import random
    random.shuffle(questions)
    return questions[:limit]

@api_router.post("/progress/update")
async def update_progress(request: Request, authorization: Optional[str] = Header(None), book: str = None, score: int = 0, completed: bool = False):
    user = await get_current_user(request, authorization)
    
    existing = await db.user_progress.find_one({"user_id": user.user_id, "book": book}, {"_id": 0})
    
    if existing:
        await db.user_progress.update_one(
            {"user_id": user.user_id, "book": book},
            {"$set": {
                "score": score,
                "completed": completed,
                "completed_at": datetime.now(timezone.utc).isoformat() if completed else None
            }}
        )
    else:
        progress = UserProgress(
            user_id=user.user_id,
            book=book,
            level=1,
            score=score,
            completed=completed,
            completed_at=datetime.now(timezone.utc) if completed else None
        )
        progress_dict = progress.model_dump()
        if progress_dict.get('completed_at'):
            progress_dict['completed_at'] = progress_dict['completed_at'].isoformat()
        await db.user_progress.insert_one(progress_dict)
    
    xp_gained = score * 10
    new_xp = user.xp + xp_gained
    new_level = user.level
    
    xp_for_next_level = new_level * 100
    while new_xp >= xp_for_next_level:
        new_xp -= xp_for_next_level
        new_level += 1
        xp_for_next_level = new_level * 100
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"xp": new_xp, "level": new_level}}
    )
    
    return {"xp_gained": xp_gained, "new_level": new_level, "new_xp": new_xp}

@api_router.get("/progress")
async def get_progress(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    progress_list = await db.user_progress.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    return progress_list

@api_router.get("/badges")
async def get_user_badges(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    user_badges = await db.user_badges.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    
    badge_ids = [ub["badge_id"] for ub in user_badges]
    badges = await db.badges.find({"badge_id": {"$in": badge_ids}}, {"_id": 0}).to_list(100)
    
    return badges

@api_router.post("/daily-manna")
async def complete_daily_manna(request: Request, authorization: Optional[str] = Header(None), coins: int = 10):
    user = await get_current_user(request, authorization)
    
    today = datetime.now(timezone.utc).date()
    existing = await db.daily_manna.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if existing:
        last_played = existing["last_played"]
        if isinstance(last_played, str):
            last_played = datetime.fromisoformat(last_played)
        if last_played.tzinfo is None:
            last_played = last_played.replace(tzinfo=timezone.utc)
        
        last_played_date = last_played.date()
        
        if last_played_date == today:
            raise HTTPException(status_code=400, detail="Déjà joué aujourd'hui")
        
        new_streak = existing["streak"] + 1 if (today - last_played_date).days == 1 else 1
        
        await db.daily_manna.update_one(
            {"user_id": user.user_id},
            {"$set": {
                "last_played": datetime.now(timezone.utc).isoformat(),
                "coins_earned": existing["coins_earned"] + coins,
                "streak": new_streak
            }}
        )
    else:
        daily = DailyManna(
            user_id=user.user_id,
            last_played=datetime.now(timezone.utc),
            coins_earned=coins,
            streak=1
        )
        daily_dict = daily.model_dump()
        daily_dict['last_played'] = daily_dict['last_played'].isoformat()
        await db.daily_manna.insert_one(daily_dict)
        new_streak = 1
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$inc": {"coins": coins}}
    )
    
    return {"coins_earned": coins, "streak": new_streak, "total_coins": user.coins + coins}

@api_router.get("/daily-manna/status")
async def get_daily_manna_status(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    
    today = datetime.now(timezone.utc).date()
    existing = await db.daily_manna.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not existing:
        return {"can_play": True, "streak": 0}
    
    last_played = existing["last_played"]
    if isinstance(last_played, str):
        last_played = datetime.fromisoformat(last_played)
    if last_played.tzinfo is None:
        last_played = last_played.replace(tzinfo=timezone.utc)
    
    last_played_date = last_played.date()
    can_play = last_played_date < today
    
    return {"can_play": can_play, "streak": existing["streak"]}

class CheckoutRequest(BaseModel):
    package_id: str
    origin_url: str

@api_router.post("/premium/checkout")
async def create_checkout(request: Request, checkout_req: CheckoutRequest, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    
    if checkout_req.package_id not in PREMIUM_PACKAGES:
        raise HTTPException(status_code=400, detail="Package invalide")
    
    package = PREMIUM_PACKAGES[checkout_req.package_id]
    
    success_url = f"{checkout_req.origin_url}/premium-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{checkout_req.origin_url}/premium"
    
    host_url = checkout_req.origin_url
    webhook_url = f"{os.environ.get('REACT_APP_BACKEND_URL', 'https://biblequest-preview.preview.emergentagent.com')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    checkout_request = CheckoutSessionRequest(
        amount=package["amount"],
        currency=package["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user.user_id,
            "package_id": checkout_req.package_id,
            "duration_hours": str(package["duration_hours"])
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    transaction = PaymentTransaction(
        session_id=session.session_id,
        user_id=user.user_id,
        amount=package["amount"],
        currency=package["currency"],
        package_id=checkout_req.package_id,
        payment_status="pending",
        status="initiated",
        metadata={
            "duration_hours": package["duration_hours"],
            "package_name": package["name"]
        }
    )
    transaction_dict = transaction.model_dump()
    transaction_dict['created_at'] = transaction_dict['created_at'].isoformat()
    await db.payment_transactions.insert_one(transaction_dict)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/premium/status/{session_id}")
async def check_payment_status(session_id: str, request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    
    transaction = await db.payment_transactions.find_one(
        {"session_id": session_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction non trouvée")
    
    if transaction["payment_status"] == "paid":
        return {"status": "paid", "message": "Paiement réussi"}
    
    webhook_url = f"{os.environ.get('REACT_APP_BACKEND_URL', 'https://biblequest-preview.preview.emergentagent.com')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        checkout_status = await stripe_checkout.get_checkout_status(session_id)
        
        if checkout_status.payment_status == "paid" and transaction["payment_status"] != "paid":
            duration_hours = int(transaction["metadata"]["duration_hours"])
            premium_expires_at = datetime.now(timezone.utc) + timedelta(hours=duration_hours)
            
            await db.users.update_one(
                {"user_id": user.user_id},
                {"$set": {
                    "is_premium": True,
                    "premium_expires_at": premium_expires_at.isoformat()
                }}
            )
            
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {
                    "payment_status": checkout_status.payment_status,
                    "status": "completed"
                }}
            )
            
            return {"status": "paid", "message": "Paiement réussi", "premium_expires_at": premium_expires_at.isoformat()}
        
        return {"status": checkout_status.status, "payment_status": checkout_status.payment_status}
    except Exception as e:
        logging.error(f"Erreur lors de la vérification du statut: {e}")
        return {"status": transaction["status"], "payment_status": transaction["payment_status"]}

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    webhook_url = f"{os.environ.get('REACT_APP_BACKEND_URL', 'https://biblequest-preview.preview.emergentagent.com')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        transaction = await db.payment_transactions.find_one(
            {"session_id": webhook_response.session_id},
            {"_id": 0}
        )
        
        if not transaction:
            return {"status": "ignored"}
        
        if webhook_response.payment_status == "paid" and transaction["payment_status"] != "paid":
            duration_hours = int(transaction["metadata"]["duration_hours"])
            premium_expires_at = datetime.now(timezone.utc) + timedelta(hours=duration_hours)
            
            await db.users.update_one(
                {"user_id": transaction["user_id"]},
                {"$set": {
                    "is_premium": True,
                    "premium_expires_at": premium_expires_at.isoformat()
                }}
            )
            
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": {
                    "payment_status": webhook_response.payment_status,
                    "status": "completed"
                }}
            )
        
        return {"status": "success"}
    except Exception as e:
        logging.error(f"Erreur webhook: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/game-modes")
async def get_game_modes(request: Request, authorization: Optional[str] = Header(None), category: Optional[str] = None):
    user = await get_current_user(request, authorization)
    
    query = {}
    if category:
        query["category"] = category
    
    modes = await db.game_modes.find(query, {"_id": 0}).to_list(100)
    return modes

@api_router.get("/game-modes/categories")
async def get_game_categories():
    pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    categories = await db.game_modes.aggregate(pipeline).to_list(100)
    return [{"name": cat["_id"], "count": cat["count"]} for cat in categories]

class GameStartRequest(BaseModel):
    mode_id: str

@api_router.post("/games/start")
async def start_game(request: Request, game_request: GameStartRequest, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    
    mode = await db.game_modes.find_one({"mode_id": game_request.mode_id}, {"_id": 0})
    if not mode:
        raise HTTPException(status_code=404, detail="Mode de jeu non trouvé")
    
    if not mode.get("available", False):
        raise HTTPException(status_code=403, detail="Ce mode n'est pas encore disponible")
    
    game_data = await generate_game_data(game_request.mode_id)
    
    session_id = f"game_{uuid.uuid4().hex[:12]}"
    game_session = {
        "session_id": session_id,
        "user_id": user.user_id,
        "mode_id": game_request.mode_id,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed": False,
        "score": 0,
        "data": game_data
    }
    
    await db.game_sessions.insert_one(game_session)
    
    return {"session_id": session_id, "game_data": game_data, "mode": mode}

async def generate_game_data(mode_id: str):
    if mode_id == "quiz_qui_a_dit":
        quotes = [
            {"text": "Je suis le chemin, la vérité et la vie", "author": "Jésus", "options": ["Pierre", "Jésus", "Paul", "Jean"]},
            {"text": "Me voici, envoie-moi", "author": "Ésaïe", "options": ["Moïse", "David", "Ésaïe", "Jérémie"]},
            {"text": "L'Éternel est mon berger", "author": "David", "options": ["Salomon", "David", "Samuel", "Élie"]},
            {"text": "Avant que tu naisses, je t'ai connu", "author": "Dieu", "options": ["Dieu", "Moïse", "Abraham", "Jacob"]},
            {"text": "Que ton règne vienne", "author": "Jésus", "options": ["Jean", "Pierre", "Jésus", "Matthieu"]}
        ]
        import random
        random.shuffle(quotes)
        return {"quotes": quotes[:5]}
    
    elif mode_id == "quiz_vrai_faux":
        statements = [
            {"text": "Jésus a changé l'eau en vin à Cana", "answer": True},
            {"text": "Moïse a traversé la mer Morte", "answer": False},
            {"text": "David a vaincu Goliath avec une épée", "answer": False},
            {"text": "Jonas a été avalé par un grand poisson", "answer": True},
            {"text": "Marie-Madeleine était l'épouse de Jésus", "answer": False},
            {"text": "Pierre a marché sur l'eau", "answer": True},
            {"text": "Abraham avait 100 ans quand Isaac est né", "answer": True},
            {"text": "Il y a 13 apôtres", "answer": False}
        ]
        import random
        random.shuffle(statements)
        return {"statements": statements[:6]}
    
    elif mode_id == "chrono_versets":
        verses = [
            {"text": "Car Dieu a tant aimé le monde qu'il a donné son Fils unique", "missing": "monde", "reference": "Jean 3:16"},
            {"text": "L'Éternel est mon berger, je ne manquerai de rien", "missing": "berger", "reference": "Psaume 23:1"},
            {"text": "Je puis tout par celui qui me fortifie", "missing": "fortifie", "reference": "Philippiens 4:13"},
            {"text": "Demandez et vous recevrez", "missing": "recevrez", "reference": "Matthieu 7:7"}
        ]
        import random
        random.shuffle(verses)
        return {"verses": verses[:3]}
    
    elif mode_id == "mots_caches":
        grid_size = 12
        words = ["GENESE", "EXODE", "JEAN", "MARC", "LUC", "ACTES", "PAUL", "DAVID"]
        grid_result = generate_word_search_grid(words, grid_size)
        return {"grid_size": grid_size, "words": words, "grid": grid_result["grid"], "placements": grid_result["placements"]}
    
    elif mode_id == "anagrammes":
        anagrams = [
            {"scrambled": "OSMEI", "answer": "MOISE"},
            {"scrambled": "VDDAI", "answer": "DAVID"},
            {"text": "EHERST", "answer": "ESTHER"},
            {"scrambled": "ULAP", "answer": "PAUL"},
            {"scrambled": "RREIPE", "answer": "PIERRE"}
        ]
        import random
        random.shuffle(anagrams)
        return {"anagrams": anagrams[:4]}
    
    elif mode_id == "memory_biblique":
        symbols = ["✝️", "🕊️", "🍞", "🐟", "⚓", "🌟", "💒", "📖"]
        cards = []
        for symbol in symbols:
            cards.append({"id": f"{symbol}_1", "symbol": symbol})
            cards.append({"id": f"{symbol}_2", "symbol": symbol})
        import random
        random.shuffle(cards)
        return {"cards": cards}
    
    elif mode_id == "labyrinthe_exode":
        maze_data = generate_maze(15, 15)
        questions = [
            {"text": "Qui a guidé le peuple hors d'Égypte ?", "options": ["Abraham", "Moïse", "David", "Josué"], "answer": 1},
            {"text": "Combien de plaies Dieu a-t-il envoyées ?", "options": ["5", "7", "10", "12"], "answer": 2},
            {"text": "Quelle mer le peuple a-t-il traversée ?", "options": ["Mer Morte", "Mer Rouge", "Mer Méditerranée", "Mer de Galilée"], "answer": 1}
        ]
        return {**maze_data, "questions": questions}
    
    return {}

def generate_word_search_grid(words: List[str], size: int) -> dict:
    import random
    grid = [['' for _ in range(size)] for _ in range(size)]
    placements = {}
    
    for word in words:
        placed = False
        attempts = 0
        while not placed and attempts < 100:
            direction = random.choice(['H', 'V', 'D'])
            if direction == 'H':
                row = random.randint(0, size-1)
                col = random.randint(0, size-len(word))
                if all(grid[row][col+i] in ('', word[i]) for i in range(len(word))):
                    for i, char in enumerate(word):
                        grid[row][col+i] = char
                    placements[word] = {"start": [row, col], "direction": "H", "length": len(word)}
                    placed = True
            elif direction == 'V':
                row = random.randint(0, size-len(word))
                col = random.randint(0, size-1)
                if all(grid[row+i][col] in ('', word[i]) for i in range(len(word))):
                    for i, char in enumerate(word):
                        grid[row+i][col] = char
                    placements[word] = {"start": [row, col], "direction": "V", "length": len(word)}
                    placed = True
            else:
                row = random.randint(0, size-len(word))
                col = random.randint(0, size-len(word))
                if all(grid[row+i][col+i] in ('', word[i]) for i in range(len(word))):
                    for i, char in enumerate(word):
                        grid[row+i][col+i] = char
                    placements[word] = {"start": [row, col], "direction": "D", "length": len(word)}
                    placed = True
            attempts += 1
    
    for i in range(size):
        for j in range(size):
            if grid[i][j] == '':
                grid[i][j] = random.choice('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    
    return {"grid": grid, "placements": placements}

def generate_maze(width: int, height: int) -> dict:
    import random
    maze = [[1 for _ in range(width)] for _ in range(height)]
    
    def carve(x, y):
        maze[y][x] = 0
        directions = [(0, -2), (0, 2), (-2, 0), (2, 0)]
        random.shuffle(directions)
        for dx, dy in directions:
            nx, ny = x + dx, y + dy
            if 0 <= nx < width and 0 <= ny < height and maze[ny][nx] == 1:
                maze[y + dy // 2][x + dx // 2] = 0
                carve(nx, ny)
    
    carve(1, 1)
    maze[1][0] = 0
    maze[height - 2][width - 1] = 0
    
    return {
        "maze": maze,
        "start": [0, 1],
        "end": [width - 1, height - 2],
        "width": width,
        "height": height
    }

class GameSubmitRequest(BaseModel):
    session_id: str
    answers: Dict[str, Any]

@api_router.post("/games/submit")
async def submit_game(request: Request, submit_request: GameSubmitRequest, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    
    session = await db.game_sessions.find_one(
        {"session_id": submit_request.session_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not session:
        raise HTTPException(status_code=404, detail="Session de jeu non trouvée")
    
    if session.get("completed"):
        raise HTTPException(status_code=400, detail="Cette session est déjà terminée")
    
    score = calculate_score(session["mode_id"], session["data"], submit_request.answers)
    
    await db.game_sessions.update_one(
        {"session_id": submit_request.session_id},
        {"$set": {
            "completed": True,
            "score": score,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "user_answers": submit_request.answers
        }}
    )
    
    xp_gained = score * 5
    new_xp = user.xp + xp_gained
    new_level = user.level
    
    xp_for_next_level = new_level * 100
    while new_xp >= xp_for_next_level:
        new_xp -= xp_for_next_level
        new_level += 1
        xp_for_next_level = new_level * 100
    
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"xp": new_xp, "level": new_level}, "$inc": {"coins": score}}
    )
    
    return {"score": score, "xp_gained": xp_gained, "new_level": new_level, "coins_earned": score}

def calculate_score(mode_id: str, game_data: dict, user_answers: dict) -> int:
    score = 0
    
    if mode_id == "quiz_qui_a_dit":
        for i, quote in enumerate(game_data.get("quotes", [])):
            if user_answers.get(f"q_{i}") == quote["author"]:
                score += 1
    
    elif mode_id == "quiz_vrai_faux":
        for i, stmt in enumerate(game_data.get("statements", [])):
            if user_answers.get(f"q_{i}") == stmt["answer"]:
                score += 1
    
    elif mode_id == "chrono_versets":
        for i, verse in enumerate(game_data.get("verses", [])):
            if user_answers.get(f"q_{i}", "").lower() == verse["missing"].lower():
                score += 1
    
    elif mode_id == "anagrammes":
        for i, anagram in enumerate(game_data.get("anagrams", [])):
            if user_answers.get(f"q_{i}", "").upper() == anagram["answer"]:
                score += 1
    
    elif mode_id == "memory_biblique":
        score = user_answers.get("matches", 0)
    
    elif mode_id == "mots_caches":
        score = user_answers.get("words_found", 0)
    
    elif mode_id == "labyrinthe_exode":
        completed = user_answers.get("completed", False)
        questions_correct = user_answers.get("questions_correct", 0)
        time_bonus = max(0, user_answers.get("time_bonus", 0))
        score = (5 if completed else 0) + questions_correct + time_bonus
    
    return score

@api_router.get("/leaderboard")
async def get_leaderboard(period: str = "all_time", category: Optional[str] = None, limit: int = 50):
    query = {}
    if category:
        query["category"] = category
    if period != "all_time":
        query["period"] = period
    
    leaderboard = await db.leaderboard.find(query, {"_id": 0}).sort("score", -1).limit(limit).to_list(limit)
    return leaderboard

@api_router.post("/leaderboard/update")
async def update_leaderboard(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    
    total_score = 0
    sessions = await db.game_sessions.find({"user_id": user.user_id, "completed": True}, {"_id": 0}).to_list(1000)
    total_score = sum(s.get("score", 0) for s in sessions)
    
    await db.leaderboard.update_one(
        {"user_id": user.user_id, "period": "all_time"},
        {"$set": {
            "user_id": user.user_id,
            "name": user.name,
            "picture": user.picture,
            "score": total_score,
            "level": user.level,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"total_score": total_score}

class CreateGroupSessionRequest(BaseModel):
    name: str
    max_players: int = 50

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
        "name": session_req.name,
        "max_players": session_req.max_players,
        "players": [],
        "active": True,
        "started": False,
        "current_question": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.group_sessions.insert_one(session)
    
    return {"session_id": session["session_id"], "pin_code": pin_code}

class JoinGroupRequest(BaseModel):
    pin_code: str
    nickname: str

@api_router.post("/group/join")
async def join_group_session(request: Request, join_req: JoinGroupRequest, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    
    session = await db.group_sessions.find_one({"pin_code": join_req.pin_code, "active": True}, {"_id": 0})
    
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    if len(session.get("players", [])) >= session["max_players"]:
        raise HTTPException(status_code=400, detail="Session pleine")
    
    if session.get("started"):
        raise HTTPException(status_code=400, detail="Session déjà commencée")
    
    player = {
        "user_id": user.user_id,
        "nickname": join_req.nickname,
        "picture": user.picture,
        "score": 0,
        "joined_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.group_sessions.update_one(
        {"pin_code": join_req.pin_code},
        {"$push": {"players": player}}
    )
    
    return {"session_id": session["session_id"], "message": "Rejoint avec succès"}

@api_router.get("/group/{session_id}")
async def get_group_session(session_id: str, request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    
    session = await db.group_sessions.find_one({"session_id": session_id}, {"_id": 0})
    
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    return session

class DuoMatchRequest(BaseModel):
    mode: str = "random"
    friend_code: Optional[str] = None
    theme: Optional[str] = None

@api_router.post("/duo/matchmaking")
async def start_duo_match(request: Request, match_req: DuoMatchRequest, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    
    today = datetime.now(timezone.utc).date().isoformat()
    quota = await db.duo_quotas.find_one({"user_id": user.user_id, "date": today}, {"_id": 0})
    
    if not user.is_premium:
        daily_count = quota.get("count", 0) if quota else 0
        if daily_count >= 3:
            raise HTTPException(status_code=403, detail="Limite de 3 duels/jour atteinte. Passez Premium pour illimité !")
    
    if match_req.mode == "friend" and match_req.friend_code:
        pending_match = await db.duo_matches.find_one(
            {"friend_code": match_req.friend_code, "status": "waiting"},
            {"_id": 0}
        )
        
        if pending_match:
            match_id = pending_match["match_id"]
            
            questions = await generate_duo_questions()
            
            await db.duo_matches.update_one(
                {"match_id": match_id},
                {"$set": {
                    "player2_id": user.user_id,
                    "player2_name": user.name,
                    "player2_picture": user.picture,
                    "status": "ready",
                    "questions": questions,
                    "started_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            if not user.is_premium:
                await db.duo_quotas.update_one(
                    {"user_id": user.user_id, "date": today},
                    {"$inc": {"count": 1}, "$setOnInsert": {"date": today}},
                    upsert=True
                )
            
            return {"match_id": match_id, "role": "player2", "status": "ready", "user_id": user.user_id}
        else:
            raise HTTPException(status_code=404, detail="Match non trouvé")
    
    friend_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    match = {
        "match_id": f"duo_{uuid.uuid4().hex[:12]}",
        "friend_code": friend_code,
        "player1_id": user.user_id,
        "player1_name": user.name,
        "player1_picture": user.picture,
        "player1_score": 0,
        "player1_answers": [],
        "player2_id": None,
        "player2_name": None,
        "player2_picture": None,
        "player2_score": 0,
        "player2_answers": [],
        "status": "waiting",
        "current_question": 0,
        "questions": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.duo_matches.insert_one(match)
    
    if not user.is_premium:
        await db.duo_quotas.update_one(
            {"user_id": user.user_id, "date": today},
            {"$inc": {"count": 1}, "$setOnInsert": {"date": today}},
            upsert=True
        )
    
    return {"match_id": match["match_id"], "friend_code": friend_code, "role": "player1", "status": "waiting", "user_id": user.user_id}

async def generate_duo_questions(theme: Optional[str] = None):
    query = {}
    
    if theme:
        theme_queries = {
            "paraboles": {"text": {"$regex": "parabole", "$options": "i"}},
            "miracles": {"text": {"$regex": "miracle", "$options": "i"}},
            "ancien": {"book": {"$in": ["Genèse", "Exode", "Lévitique", "Nombres", "Deutéronome", "Josué", "Juges", "Ruth", "Samuel", "Rois", "Chroniques", "Esdras", "Néhémie", "Esther", "Job", "Psaumes", "Proverbes", "Ecclésiaste", "Cantique", "Ésaïe", "Jérémie", "Lamentations", "Ézéchiel", "Daniel", "Osée", "Joël", "Amos", "Abdias", "Jonas", "Michée", "Nahum", "Habacuc", "Sophonie", "Aggée", "Zacharie", "Malachie"]}},
            "nouveau": {"book": {"$in": ["Matthieu", "Marc", "Luc", "Jean", "Actes", "Romains", "Corinthiens", "Galates", "Éphésiens", "Philippiens", "Colossiens", "Thessaloniciens", "Timothée", "Tite", "Philémon", "Hébreux", "Jacques", "Pierre", "Jean", "Jude", "Apocalypse"]}},
            "apotres": {"text": {"$regex": "apôtre|Pierre|Jean|Jacques|André|Philippe|Thomas|Matthieu|Barthélemy|Simon|Judas|Paul", "$options": "i"}},
            "femmes": {"text": {"$regex": "Marie|Marthe|Esther|Ruth|Déborah|Sara|Rebecca|Rachel", "$options": "i"}},
            "prophetes": {"text": {"$regex": "prophète|Ésaïe|Jérémie|Ézéchiel|Daniel|Osée|Joël|Amos|Jonas|Michée", "$options": "i"}}
        }
        
        query = theme_queries.get(theme.lower(), {})
    
    questions = await db.questions.find(query, {"_id": 0}).to_list(100)
    if not questions:
        questions = await db.questions.find({}, {"_id": 0}).to_list(100)
    
    random.shuffle(questions)
    return questions[:10]

duo_rooms = {}

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
    
    for room_id, room_data in list(duo_rooms.items()):
        if sid in room_data.get('players', {}):
            player_role = 'player1' if room_data['players'].get('player1') == sid else 'player2'
            await sio.emit('opponent_disconnected', {'message': 'Adversaire déconnecté'}, room=room_id, skip_sid=sid)
            if room_id in duo_rooms:
                del duo_rooms[room_id]

@sio.event
async def join_duo_room(sid, data):
    match_id = data.get('match_id')
    user_id = data.get('user_id')
    role = data.get('role')
    
    if not match_id:
        return
    
    await sio.enter_room(sid, match_id)
    
    if match_id not in duo_rooms:
        duo_rooms[match_id] = {
            'players': {},
            'ready': {},
            'answers': {},
            'scores': {'player1': 0, 'player2': 0},
            'current_question': 0
        }
    
    duo_rooms[match_id]['players'][role] = sid
    duo_rooms[match_id]['ready'][role] = False
    
    await sio.emit('joined_room', {'role': role}, room=sid)
    
    if len(duo_rooms[match_id]['players']) == 2:
        await sio.emit('both_players_ready', {}, room=match_id)

@sio.event
async def player_ready(sid, data):
    match_id = data.get('match_id')
    role = data.get('role')
    
    if match_id not in duo_rooms:
        return
    
    duo_rooms[match_id]['ready'][role] = True
    
    await sio.emit('player_ready_status', {'role': role, 'ready': True}, room=match_id)
    
    if all(duo_rooms[match_id]['ready'].values()):
        await sio.sleep(3)
        await start_duo_game(match_id)

async def start_duo_game(match_id):
    match = await db.duo_matches.find_one({"match_id": match_id}, {"_id": 0})
    
    if not match or not match.get('questions'):
        return
    
    await send_next_question(match_id, 0, match['questions'])

async def send_next_question(match_id, question_index, questions):
    if question_index >= len(questions):
        await end_duo_game(match_id)
        return
    
    question = questions[question_index]
    
    question_data = {
        "question_index": question_index,
        "total_questions": len(questions),
        "text": question["text"],
        "options": question["options"],
        "book": question.get("book", ""),
        "timer": 15
    }
    
    duo_rooms[match_id]['answers'] = {}
    duo_rooms[match_id]['start_time'] = datetime.now(timezone.utc).timestamp()
    
    await sio.emit('new_question', question_data, room=match_id)

@sio.event
async def submit_answer(sid, data):
    match_id = data.get('match_id')
    role = data.get('role')
    answer_index = data.get('answer')
    
    if match_id not in duo_rooms:
        return
    
    answer_time = datetime.now(timezone.utc).timestamp()
    time_taken = answer_time - duo_rooms[match_id]['start_time']
    
    duo_rooms[match_id]['answers'][role] = {
        'answer': answer_index,
        'time': time_taken
    }
    
    await sio.emit('opponent_answered', {'role': role}, room=match_id, skip_sid=sid)
    
    if len(duo_rooms[match_id]['answers']) == 2:
        await process_round_results(match_id)

async def process_round_results(match_id):
    match = await db.duo_matches.find_one({"match_id": match_id}, {"_id": 0})
    
    if not match:
        return
    
    current_q = duo_rooms[match_id]['current_question']
    question = match['questions'][current_q]
    correct_answer = question['correct_answer']
    
    results = {}
    
    for role in ['player1', 'player2']:
        if role in duo_rooms[match_id]['answers']:
            answer_data = duo_rooms[match_id]['answers'][role]
            is_correct = answer_data['answer'] == correct_answer
            time_taken = answer_data['time']
            
            points = 0
            if is_correct:
                time_bonus = max(0, 15 - time_taken) / 15
                points = int(100 + (100 * time_bonus))
            
            duo_rooms[match_id]['scores'][role] += points
            
            results[role] = {
                'correct': is_correct,
                'points': points,
                'time': round(time_taken, 2),
                'total_score': duo_rooms[match_id]['scores'][role]
            }
    
    results['correct_answer'] = correct_answer
    
    await sio.emit('round_results', results, room=match_id)
    
    await db.duo_matches.update_one(
        {"match_id": match_id},
        {"$set": {
            f"player1_score": duo_rooms[match_id]['scores']['player1'],
            f"player2_score": duo_rooms[match_id]['scores']['player2']
        }}
    )
    
    await sio.sleep(3)
    
    duo_rooms[match_id]['current_question'] += 1
    await send_next_question(match_id, duo_rooms[match_id]['current_question'], match['questions'])

async def end_duo_game(match_id):
    scores = duo_rooms[match_id]['scores']
    
    match = await db.duo_matches.find_one({"match_id": match_id}, {"_id": 0})
    
    winner = None
    if scores['player1'] > scores['player2']:
        winner = 'player1'
    elif scores['player2'] > scores['player1']:
        winner = 'player2'
    else:
        winner = 'draw'
    
    await db.duo_matches.update_one(
        {"match_id": match_id},
        {"$set": {
            "status": "completed",
            "winner": winner,
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await check_duo_badges(match['player1_id'], winner == 'player1', match_id)
    await check_duo_badges(match['player2_id'], winner == 'player2', match_id)
    
    await update_mmr(match['player1_id'], match['player2_id'], winner, match.get('player1_mmr', 1000), match.get('player2_mmr', 1000))
    
    final_results = {
        "player1_score": scores['player1'],
        "player2_score": scores['player2'],
        "winner": winner
    }
    
    await sio.emit('game_end', final_results, room=match_id)
    
    if match_id in duo_rooms:
        del duo_rooms[match_id]

async def update_mmr(player1_id, player2_id, winner, mmr1, mmr2):
    k_factor = 30
    
    expected1 = 1 / (1 + 10 ** ((mmr2 - mmr1) / 400))
    expected2 = 1 / (1 + 10 ** ((mmr1 - mmr2) / 400))
    
    if winner == 'player1':
        score1, score2 = 1, 0
    elif winner == 'player2':
        score1, score2 = 0, 1
    else:
        score1, score2 = 0.5, 0.5
    
    new_mmr1 = mmr1 + k_factor * (score1 - expected1)
    new_mmr2 = mmr2 + k_factor * (score2 - expected2)
    
    new_mmr1 = max(0, int(new_mmr1))
    new_mmr2 = max(0, int(new_mmr2))
    
    for user_id, new_mmr, won in [(player1_id, new_mmr1, winner == 'player1'), (player2_id, new_mmr2, winner == 'player2')]:
        result = "wins" if won else "draws" if winner == "draw" else "losses"
        
        await db.duo_leaderboard.update_one(
            {"user_id": user_id},
            {
                "$set": {"mmr": new_mmr},
                "$inc": {result: 1}
            },
            upsert=True
        )

async def check_duo_badges(user_id, won, match_id):
    match_count = await db.duo_matches.count_documents({
        "$or": [{"player1_id": user_id}, {"player2_id": user_id}],
        "status": "completed"
    })
    
    if match_count == 1:
        await award_badge(user_id, "badge_premier_duel")
    elif match_count == 10:
        await award_badge(user_id, "badge_veteranUEL")

async def award_badge(user_id, badge_id):
    existing = await db.user_achievements.find_one({"user_id": user_id, "achievement_id": badge_id})
    if not existing:
        await db.user_achievements.insert_one({
            "user_id": user_id,
            "achievement_id": badge_id,
            "earned_at": datetime.now(timezone.utc).isoformat()
        })

@sio.event
async def send_emoji(sid, data):
    match_id = data.get('match_id')
    emoji = data.get('emoji')
    role = data.get('role')
    
    await sio.emit('emoji_received', {'emoji': emoji, 'from': role}, room=match_id, skip_sid=sid)

@sio.event
async def request_rematch(sid, data):
    match_id = data.get('match_id')
    role = data.get('role')
    
    await sio.emit('rematch_requested', {'from': role}, room=match_id, skip_sid=sid)

matchmaking_queue = []

@api_router.post("/duo/matchmaking/auto")
async def auto_matchmaking(request: Request, match_req: DuoMatchRequest, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    
    today = datetime.now(timezone.utc).date().isoformat()
    quota = await db.duo_quotas.find_one({"user_id": user.user_id, "date": today}, {"_id": 0})
    
    if not user.is_premium:
        daily_count = quota.get("count", 0) if quota else 0
        if daily_count >= 3:
            raise HTTPException(status_code=403, detail="Limite de 3 duels/jour atteinte. Passez Premium pour illimité !")
    
    user_stats = await db.duo_leaderboard.find_one({"user_id": user.user_id}, {"_id": 0})
    user_mmr = user_stats.get("mmr", 1000) if user_stats else 1000
    
    theme = match_req.theme if user.is_premium else None
    
    matched_opponent = None
    for i, queued in enumerate(matchmaking_queue):
        mmr_diff = abs(queued["mmr"] - user_mmr)
        if mmr_diff <= 200 and queued["user_id"] != user.user_id:
            matched_opponent = queued
            matchmaking_queue.pop(i)
            break
    
    if matched_opponent:
        questions = await generate_duo_questions(theme)
        
        match = {
            "match_id": f"duo_{uuid.uuid4().hex[:12]}",
            "friend_code": None,
            "player1_id": matched_opponent["user_id"],
            "player1_name": matched_opponent["name"],
            "player1_picture": matched_opponent["picture"],
            "player1_score": 0,
            "player1_answers": [],
            "player1_mmr": matched_opponent["mmr"],
            "player2_id": user.user_id,
            "player2_name": user.name,
            "player2_picture": user.picture,
            "player2_score": 0,
            "player2_answers": [],
            "player2_mmr": user_mmr,
            "status": "ready",
            "current_question": 0,
            "questions": questions,
            "theme": theme,
            "matchmaking_type": "auto",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.duo_matches.insert_one(match)
        
        if not user.is_premium:
            await db.duo_quotas.update_one(
                {"user_id": user.user_id, "date": today},
                {"$inc": {"count": 1}, "$setOnInsert": {"date": today}},
                upsert=True
            )
        
        return {"match_id": match["match_id"], "role": "player2", "status": "ready", "opponent": matched_opponent["name"]}
    
    else:
        matchmaking_queue.append({
            "user_id": user.user_id,
            "name": user.name,
            "picture": user.picture,
            "mmr": user_mmr,
            "theme": theme,
            "timestamp": datetime.now(timezone.utc).timestamp()
        })
        
        return {"status": "queued", "message": "En recherche d'adversaire...", "position": len(matchmaking_queue)}

@api_router.post("/duo/matchmaking/cancel")
async def cancel_matchmaking(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    
    global matchmaking_queue
    matchmaking_queue = [q for q in matchmaking_queue if q["user_id"] != user.user_id]
    
    return {"message": "Matchmaking annulé"}

@api_router.get("/duo/history")
async def get_duo_history(request: Request, authorization: Optional[str] = Header(None), filter: str = "all", limit: int = 50):
    user = await get_current_user(request, authorization)
    
    if not user.is_premium:
        raise HTTPException(status_code=403, detail="Fonctionnalité réservée Premium")
    
    query = {
        "$or": [{"player1_id": user.user_id}, {"player2_id": user.user_id}],
        "status": "completed"
    }
    
    if filter == "wins":
        query["winner"] = {"$in": ["player1", "player2"]}
    elif filter == "losses":
        query["$and"] = [
            {"$or": [{"player1_id": user.user_id}, {"player2_id": user.user_id}]},
            {"winner": {"$nin": ["player1", "player2", "draw"]}}
        ]
    elif filter == "draws":
        query["winner"] = "draw"
    
    matches = await db.duo_matches.find(query, {"_id": 0}).sort("completed_at", -1).limit(limit).to_list(limit)
    
    history = []
    for match in matches:
        is_player1 = match["player1_id"] == user.user_id
        opponent_name = match["player2_name"] if is_player1 else match["player1_name"]
        my_score = match["player1_score"] if is_player1 else match["player2_score"]
        opp_score = match["player2_score"] if is_player1 else match["player1_score"]
        
        result = "win" if (is_player1 and match["winner"] == "player1") or (not is_player1 and match["winner"] == "player2") else "loss" if match["winner"] != "draw" else "draw"
        
        history.append({
            "match_id": match["match_id"],
            "opponent": opponent_name,
            "my_score": my_score,
            "opponent_score": opp_score,
            "result": result,
            "theme": match.get("theme"),
            "completed_at": match.get("completed_at"),
            "questions": match.get("questions") if user.is_premium else None
        })
    
    return history

@api_router.get("/duo/stats")
async def get_duo_stats(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    
    stats = await db.duo_leaderboard.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not stats:
        return {
            "mmr": 1000,
            "wins": 0,
            "losses": 0,
            "draws": 0,
            "winrate": 0,
            "total_matches": 0,
            "rank": None
        }
    
    wins = stats.get("wins", 0)
    losses = stats.get("losses", 0)
    draws = stats.get("draws", 0)
    mmr = stats.get("mmr", 1000)
    total = wins + losses + draws
    winrate = (wins / total * 100) if total > 0 else 0
    
    rank = await db.duo_leaderboard.count_documents({"mmr": {"$gt": mmr}}) + 1
    
    return {
        "mmr": mmr,
        "wins": wins,
        "losses": losses,
        "draws": draws,
        "winrate": round(winrate, 1),
        "total_matches": total,
        "rank": rank
    }

@api_router.get("/duo/leaderboard")
async def get_duo_leaderboard(limit: int = 100):
    leaderboard = await db.duo_leaderboard.find({}, {"_id": 0}).sort("mmr", -1).limit(limit).to_list(limit)
    
    enriched = []
    for idx, entry in enumerate(leaderboard):
        user_doc = await db.users.find_one({"user_id": entry["user_id"]}, {"_id": 0, "name": 1, "picture": 1, "level": 1})
        
        if user_doc:
            wins = entry.get("wins", 0)
            losses = entry.get("losses", 0)
            draws = entry.get("draws", 0)
            total = wins + losses + draws
            winrate = (wins / total * 100) if total > 0 else 0
            
            enriched.append({
                "rank": idx + 1,
                "user_id": entry["user_id"],
                "name": user_doc.get("name", "Inconnu"),
                "picture": user_doc.get("picture"),
                "level": user_doc.get("level", 1),
                "mmr": entry.get("mmr", 1000),
                "wins": wins,
                "losses": losses,
                "draws": draws,
                "winrate": round(winrate, 1),
                "total_matches": total
            })
    
    return enriched

@api_router.get("/duo/active-matches")
async def get_active_matches(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    
    matches = await db.duo_matches.find(
        {"status": {"$in": ["ready", "playing"]}, "started_at": {"$exists": True}},
        {"_id": 0, "match_id": 1, "player1_name": 1, "player2_name": 1, "player1_score": 1, "player2_score": 1, "current_question": 1}
    ).limit(20).to_list(20)
    
    return matches

@api_router.get("/duo/{match_id}")
async def get_duo_match(match_id: str, request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    
    match = await db.duo_matches.find_one({"match_id": match_id}, {"_id": 0})
    
    if not match:
        raise HTTPException(status_code=404, detail="Match non trouvé")
    
    return match

@api_router.post("/tournaments/create")
async def create_tournament(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    
    body = await request.json()
    name = body.get("name", "Tournoi")
    start_date = body.get("start_date", (datetime.now(timezone.utc) + timedelta(days=1)).isoformat())
    max_players = body.get("max_players", 16)
    
    tournament = {
        "tournament_id": f"tour_{uuid.uuid4().hex[:12]}",
        "name": name,
        "organizer_id": user.user_id,
        "organizer_name": user.name,
        "start_date": start_date,
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
    
    await db.tournaments.update_one(
        {"tournament_id": tournament_id},
        {"$push": {"participants": {
            "user_id": user.user_id,
            "name": user.name,
            "picture": user.picture,
            "registered_at": datetime.now(timezone.utc).isoformat()
        }}}
    )
    
    return {"message": "Inscription réussie", "participants_count": len(tournament["participants"]) + 1}

@api_router.get("/tournaments/active")
async def get_active_tournaments():
    tournaments = await db.tournaments.find(
        {"status": {"$in": ["registration", "ongoing"]}},
        {"_id": 0}
    ).sort("start_date", 1).to_list(20)
    
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
            "player1": participants[i],
            "player2": participants[i + 1],
            "winner": participants[i]["user_id"] if participants[i + 1]["user_id"] == "BYE" else None,
            "player1_score": 0,
            "player2_score": 0,
            "status": "completed" if participants[i + 1]["user_id"] == "BYE" else "pending"
        })
    
    await db.tournaments.update_one(
        {"tournament_id": tournament_id},
        {"$set": {"status": "ongoing", "brackets": matches, "current_round": 1}}
    )
    
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
        winners = []
        for m in round_matches:
            w_id = m["winner"]
            winner_data = m["player1"] if m["player1"]["user_id"] == w_id else m["player2"]
            winners.append(winner_data)
        
        if len(winners) == 1:
            new_status = "completed"
            await db.tournaments.update_one(
                {"tournament_id": tournament_id},
                {"$set": {"champion": winners[0], "completed_at": datetime.now(timezone.utc).isoformat()}}
            )
        else:
            if len(winners) % 2 != 0:
                winners.append({"user_id": "BYE", "name": "BYE", "picture": None})
            
            new_round = current_round + 1
            for i in range(0, len(winners), 2):
                brackets.append({
                    "match_id": f"tm_{uuid.uuid4().hex[:8]}",
                    "round": new_round,
                    "player1": winners[i],
                    "player2": winners[i + 1],
                    "winner": winners[i]["user_id"] if winners[i + 1]["user_id"] == "BYE" else None,
                    "player1_score": 0,
                    "player2_score": 0,
                    "status": "completed" if winners[i + 1]["user_id"] == "BYE" else "pending"
                })
            current_round = new_round
    
    await db.tournaments.update_one(
        {"tournament_id": tournament_id},
        {"$set": {"brackets": brackets, "status": new_status, "current_round": current_round}}
    )
    
    return {"message": "Résultat enregistré", "tournament_status": new_status}

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
            category_games = await db.game_sessions.count_documents({
                "user_id": user.user_id,
                "completed": True
            })
            condition_met = category_games >= achievement["condition_value"]
        
        if condition_met:
            user_achievement = {
                "user_id": user.user_id,
                "achievement_id": achievement["achievement_id"],
                "earned_at": datetime.now(timezone.utc).isoformat()
            }
            await db.user_achievements.insert_one(user_achievement)
            newly_earned.append(achievement)
    
    return {"newly_earned": newly_earned, "count": len(newly_earned)}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

@app.on_event("startup")
async def seed_initial_data():
    questions_count = await db.questions.count_documents({})
    if questions_count == 0:
        sample_questions = [
            {
                "question_id": f"q_{uuid.uuid4().hex[:8]}",
                "book": "Genèse",
                "chapter": 1,
                "text": "Combien de jours Dieu a-t-il pris pour créer le monde ?",
                "options": ["5 jours", "6 jours", "7 jours", "8 jours"],
                "correct_answer": 1,
                "difficulty": "facile",
                "explanation": "Dieu a créé le monde en 6 jours et s'est reposé le 7ème jour."
            },
            {
                "question_id": f"q_{uuid.uuid4().hex[:8]}",
                "book": "Genèse",
                "chapter": 1,
                "text": "Qu'a créé Dieu le premier jour ?",
                "options": ["Les animaux", "La lumière", "Les plantes", "L'homme"],
                "correct_answer": 1,
                "difficulty": "facile",
                "explanation": "Le premier jour, Dieu a créé la lumière."
            },
            {
                "question_id": f"q_{uuid.uuid4().hex[:8]}",
                "book": "Exode",
                "chapter": 20,
                "text": "Combien de commandements Dieu a-t-il donnés à Moïse ?",
                "options": ["5", "10", "12", "7"],
                "correct_answer": 1,
                "difficulty": "facile",
                "explanation": "Dieu a donné 10 commandements à Moïse sur le Mont Sinaï."
            },
            {
                "question_id": f"q_{uuid.uuid4().hex[:8]}",
                "book": "Matthieu",
                "chapter": 5,
                "text": "Où Jésus a-t-il prononcé le Sermon sur la Montagne ?",
                "options": ["À Jérusalem", "Sur une montagne", "Au bord de la mer", "Dans le temple"],
                "correct_answer": 1,
                "difficulty": "moyen",
                "explanation": "Jésus a prononcé le Sermon sur la Montagne sur une montagne en Galilée."
            },
            {
                "question_id": f"q_{uuid.uuid4().hex[:8]}",
                "book": "Jean",
                "chapter": 3,
                "text": "Quel est le verset le plus célèbre de la Bible ?",
                "options": ["Psaume 23:1", "Jean 3:16", "Genèse 1:1", "Matthieu 6:9"],
                "correct_answer": 1,
                "difficulty": "facile",
                "explanation": "Jean 3:16 est souvent considéré comme le verset le plus célèbre : 'Car Dieu a tant aimé le monde...'"
            }
        ]
        await db.questions.insert_many(sample_questions)
        logger.info(f"✅ {len(sample_questions)} questions initiales créées")
    
    badges_count = await db.badges.count_documents({})
    if badges_count == 0:
        initial_badges = [
            {
                "badge_id": "badge_neophyte",
                "name": "Néophyte",
                "icon": "🌱",
                "description": "Terminer les 5 premières leçons",
                "condition_type": "lessons_completed",
                "condition_value": 5
            },
            {
                "badge_id": "badge_berger",
                "name": "Berger",
                "icon": "🐑",
                "description": "Atteindre le niveau 10",
                "condition_type": "level",
                "condition_value": 10
            },
            {
                "badge_id": "badge_levite",
                "name": "Lévite",
                "icon": "📜",
                "description": "Atteindre le niveau 25",
                "condition_type": "level",
                "condition_value": 25
            },
            {
                "badge_id": "badge_apotre",
                "name": "Apôtre",
                "icon": "⭐",
                "description": "Atteindre le niveau 50",
                "condition_type": "level",
                "condition_value": 50
            }
        ]
        await db.badges.insert_many(initial_badges)
        logger.info(f"✅ {len(initial_badges)} badges initiaux créés")
    
    game_modes_count = await db.game_modes.count_documents({})
    if game_modes_count == 0:
        game_modes = [
            {
                "mode_id": "quiz_qui_a_dit",
                "category": "Quiz et Tests",
                "name": "Qui a dit quoi ?",
                "description": "Attribuez chaque citation à son auteur biblique",
                "icon": "💬",
                "difficulty": "moyen",
                "duration_minutes": 5,
                "color": "from-blue-400 to-blue-600",
                "available": True
            },
            {
                "mode_id": "quiz_vrai_faux",
                "category": "Quiz et Tests",
                "name": "Vrai ou Faux",
                "description": "Affirmations rapides sur les miracles et événements",
                "icon": "✓✗",
                "difficulty": "facile",
                "duration_minutes": 3,
                "color": "from-green-400 to-emerald-600",
                "available": True
            },
            {
                "mode_id": "chrono_versets",
                "category": "Quiz et Tests",
                "name": "Chrono-Versets",
                "description": "Complétez un verset le plus vite possible",
                "icon": "⏱️",
                "difficulty": "moyen",
                "duration_minutes": 2,
                "color": "from-orange-400 to-orange-600",
                "available": True
            },
            {
                "mode_id": "mots_caches",
                "category": "Jeux de Mots",
                "name": "Mots Cachés Bibliques",
                "description": "Trouvez les noms des livres de la Bible cachés",
                "icon": "🔤",
                "difficulty": "facile",
                "duration_minutes": 5,
                "color": "from-purple-400 to-purple-600",
                "available": True
            },
            {
                "mode_id": "anagrammes",
                "category": "Jeux de Mots",
                "name": "Anagrammes",
                "description": "Reconstituez les noms de personnages bibliques",
                "icon": "🔀",
                "difficulty": "moyen",
                "duration_minutes": 3,
                "color": "from-pink-400 to-pink-600",
                "available": True
            },
            {
                "mode_id": "la_manne",
                "category": "Rapidité",
                "name": "La Manne du Ciel",
                "description": "Attrapez les bénédictions qui tombent",
                "icon": "🍞",
                "difficulty": "facile",
                "duration_minutes": 2,
                "color": "from-yellow-400 to-yellow-600",
                "available": True
            },
            {
                "mode_id": "tri_livres",
                "category": "Rapidité",
                "name": "Tri de Livres",
                "description": "Classez rapidement : Ancien vs Nouveau Testament",
                "icon": "📚",
                "difficulty": "facile",
                "duration_minutes": 3,
                "color": "from-indigo-400 to-indigo-600",
                "available": True
            },
            {
                "mode_id": "memory_biblique",
                "category": "Logique",
                "name": "Memory Biblique",
                "description": "Trouvez les paires de symboles chrétiens",
                "icon": "🎴",
                "difficulty": "facile",
                "duration_minutes": 5,
                "color": "from-teal-400 to-teal-600",
                "available": True
            },
            {
                "mode_id": "labyrinthe_exode",
                "category": "Logique",
                "name": "Labyrinthe de l'Exode",
                "description": "Guidez le peuple d'Égypte vers la Terre Promise",
                "icon": "🗺️",
                "difficulty": "moyen",
                "duration_minutes": 5,
                "color": "from-amber-400 to-amber-600",
                "available": True
            },
            {
                "mode_id": "brebis_perdue",
                "category": "Défis Flash",
                "name": "Trouver la Brebis Perdue",
                "description": "Retrouvez la brebis égarée parmi le troupeau",
                "icon": "🐑",
                "difficulty": "facile",
                "duration_minutes": 1,
                "color": "from-lime-400 to-lime-600",
                "available": True
            },
            {
                "mode_id": "multiplier_pains",
                "category": "Défis Flash",
                "name": "Multiplier les Pains",
                "description": "Cliquez vite pour nourrir la foule",
                "icon": "🍞",
                "difficulty": "facile",
                "duration_minutes": 1,
                "color": "from-rose-400 to-rose-600",
                "available": True
            },
            {
                "mode_id": "blind_test",
                "category": "Événements",
                "name": "Blind Test des Cantiques",
                "description": "Reconnaissez les hymnes et chants de louange",
                "icon": "🎵",
                "difficulty": "moyen",
                "duration_minutes": 10,
                "color": "from-cyan-400 to-cyan-600",
                "available": False
            },
            {
                "mode_id": "voyage_paul",
                "category": "Aventure",
                "name": "Le Voyage de Paul",
                "description": "Suivez les missions de l'apôtre Paul",
                "icon": "⛵",
                "difficulty": "difficile",
                "duration_minutes": 15,
                "color": "from-violet-400 to-violet-600",
                "available": False
            }
        ]
        await db.game_modes.insert_many(game_modes)
        logger.info(f"✅ {len(game_modes)} modes de jeu créés")
    
    achievements_count = await db.achievements.count_documents({})
    if achievements_count == 0:
        achievements = [
            {
                "achievement_id": "ach_first_game",
                "name": "Premier Pas",
                "icon": "🎮",
                "description": "Jouer votre premier jeu",
                "condition_type": "games_played",
                "condition_value": 1,
                "category": "general",
                "xp_reward": 50
            },
            {
                "achievement_id": "ach_10_games",
                "name": "Joueur Régulier",
                "icon": "🎯",
                "description": "Jouer 10 jeux",
                "condition_type": "games_played",
                "condition_value": 10,
                "category": "general",
                "xp_reward": 100
            },
            {
                "achievement_id": "ach_50_games",
                "name": "Vétéran",
                "icon": "🏆",
                "description": "Jouer 50 jeux",
                "condition_type": "games_played",
                "condition_value": 50,
                "category": "general",
                "xp_reward": 500
            },
            {
                "achievement_id": "ach_level_5",
                "name": "Disciple Dévoué",
                "icon": "⭐",
                "description": "Atteindre le niveau 5",
                "condition_type": "level",
                "condition_value": 5,
                "category": "progression",
                "xp_reward": 100
            },
            {
                "achievement_id": "ach_level_15",
                "name": "Serviteur Fidèle",
                "icon": "✨",
                "description": "Atteindre le niveau 15",
                "condition_type": "level",
                "condition_value": 15,
                "category": "progression",
                "xp_reward": 300
            },
            {
                "achievement_id": "ach_quiz_master",
                "name": "Maître du Quiz",
                "icon": "🧠",
                "description": "Compléter 20 jeux de quiz",
                "condition_type": "category_master",
                "condition_value": 20,
                "category": "quiz",
                "xp_reward": 200
            },
            {
                "achievement_id": "ach_word_wizard",
                "name": "Magicien des Mots",
                "icon": "📝",
                "description": "Compléter 15 jeux de mots",
                "condition_type": "category_master",
                "condition_value": 15,
                "category": "mots",
                "xp_reward": 200
            },
            {
                "achievement_id": "ach_speed_demon",
                "name": "Démon de Vitesse",
                "icon": "⚡",
                "description": "Compléter 15 jeux de rapidité",
                "condition_type": "category_master",
                "condition_value": 15,
                "category": "rapidite",
                "xp_reward": 200
            },
            {
                "achievement_id": "badge_premier_duel",
                "name": "Premier Duel",
                "icon": "⚔️",
                "description": "Terminer votre premier duel",
                "condition_type": "duo_played",
                "condition_value": 1,
                "category": "duo",
                "xp_reward": 100
            },
            {
                "achievement_id": "badge_veteran_duel",
                "name": "Vétéran du Duel",
                "icon": "🛡️",
                "description": "Terminer 10 duels",
                "condition_type": "duo_played",
                "condition_value": 10,
                "category": "duo",
                "xp_reward": 300
            },
            {
                "achievement_id": "badge_pacificateur",
                "name": "Pacificateur",
                "icon": "🕊️",
                "description": "Faire 5 matchs nuls d'affilée",
                "condition_type": "duo_draws",
                "condition_value": 5,
                "category": "duo",
                "xp_reward": 250
            },
            {
                "achievement_id": "badge_fidele_ami",
                "name": "Fidèle Ami",
                "icon": "🤝",
                "description": "Jouer 10 fois contre la même personne",
                "condition_type": "duo_same_opponent",
                "condition_value": 10,
                "category": "duo",
                "xp_reward": 200
            },
            {
                "achievement_id": "badge_eclair_divin",
                "name": "Éclair Divin",
                "icon": "⚡",
                "description": "Répondre juste en moins d'1 seconde",
                "condition_type": "duo_speed",
                "condition_value": 1,
                "category": "duo",
                "xp_reward": 150
            }
        ]
        await db.achievements.insert_many(achievements)
        logger.info(f"✅ {len(achievements)} achievements créés")

app = socket_app
