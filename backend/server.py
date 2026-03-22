from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, Header
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import httpx
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

app = FastAPI()
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
    webhook_url = f"{os.environ.get('REACT_APP_BACKEND_URL', 'https://divine-challenge-2.preview.emergentagent.com')}/api/webhook/stripe"
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
    
    webhook_url = f"{os.environ.get('REACT_APP_BACKEND_URL', 'https://divine-challenge-2.preview.emergentagent.com')}/api/webhook/stripe"
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
    
    webhook_url = f"{os.environ.get('REACT_APP_BACKEND_URL', 'https://divine-challenge-2.preview.emergentagent.com')}/api/webhook/stripe"
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
