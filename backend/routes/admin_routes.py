import os
import uuid
import json
import re
from fastapi import APIRouter, Request, Header, HTTPException, Response
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

from pydantic import BaseModel
from database import db
from auth import get_admin_user, get_current_user
from models import GenerateQuestionsRequest, SaveQuestionRequest, User, UserSession

load_dotenv()

class AdminLoginRequest(BaseModel):
    email: str
    password: str

# from emergentintegrations.llm.chat import LlmChat, UserMessage

router = APIRouter(prefix="/admin", tags=["admin"])

@router.post("/login")
async def admin_login(req: AdminLoginRequest, response: Response):
    """
    Dedicated login for Super Admin with master credentials.
    Creates a real session in MongoDB.
    """
    admin_email = "samyfabiol@gmail.com"
    admin_pass = "!Klivardev1"
    
    if req.email != admin_email or req.password != admin_pass:
        raise HTTPException(status_code=401, detail="Identifiants invalides")
    
    # 1. Ensure user exists and is admin in DB
    user_doc = await db.users.find_one({"email": admin_email}, {"_id": 0})
    if not user_doc:
        user_id = "user_admin_master"
        new_user = User(
            user_id=user_id,
            email=admin_email,
            name="Super Admin",
            picture="",
            is_admin=True,
            role="admin",
            status="active",
            created_at=datetime.now(timezone.utc).isoformat()
        )
        await db.users.insert_one(new_user.model_dump())
        user_doc = new_user.model_dump()
    else:
        # Update just in case
        user_id = user_doc["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"is_admin": True, "role": "admin", "status": "active"}}
        )
        user_doc["is_admin"] = True
        user_doc["role"] = "admin"
        user_doc["status"] = "active"

    # 2. Create a session
    session_token = f"admin_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session = UserSession(
        user_id=user_id,
        session_token=session_token,
        expires_at=expires_at.isoformat(),
        created_at=datetime.now(timezone.utc).isoformat()
    )
    await db.user_sessions.insert_one(session.model_dump())
    
    # Set cookie (optional but good for consistency)
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {
        "status": "success",
        "session_token": session_token,
        "user": user_doc
    }

CATEGORY_LABELS = {
    "vrai_faux": "Vrai ou Faux",
    "qui_a_dit": "Qui a dit ?",
    "chrono_versets": "Complétez le verset",
    "anagrammes": "Anagrammes bibliques",
}

PROMPTS = {
    "vrai_faux": {
        "fr": (
            "Tu es un expert en Bible. Génère {n} affirmations bibliques VRAI ou FAUX en FRANÇAIS sur le thème '{topic}'. "
            "Chaque item doit avoir : 'text' (l'affirmation), 'answer' (true ou false), 'reference' (verset biblique optionnel). "
            "Alterne entre affirmations vraies et fausses. Sois précis et factuel. "
            "Réponds UNIQUEMENT avec un JSON array valide, sans markdown ni texte autour. "
            "Exemple: [{\"text\": \"Jésus a changé l'eau en vin\", \"answer\": true, \"reference\": \"Jean 2:9\"}]"
        ),
        "en": (
            "You are a Bible expert. Generate {n} biblical TRUE or FALSE statements in ENGLISH about '{topic}'. "
            "Each item must have: 'text' (the statement), 'answer' (true or false), 'reference' (optional Bible verse). "
            "Alternate between true and false statements. Be precise and factual. "
            "Reply ONLY with a valid JSON array, no markdown. "
            "Example: [{\"text\": \"Jesus turned water into wine\", \"answer\": true, \"reference\": \"John 2:9\"}]"
        ),
    },
    "qui_a_dit": {
        "fr": (
            "Tu es un expert en Bible. Génère {n} questions 'Qui a dit ?' en FRANÇAIS sur le thème '{topic}'. "
            "Chaque item doit avoir : 'text' (la citation biblique), 'author' (la bonne réponse), "
            "'options' (array de 4 noms dont l'auteur correct), 'reference' (verset optionnel). "
            "Réponds UNIQUEMENT avec un JSON array valide. "
            "Exemple: [{\"text\": \"Je suis le chemin\", \"author\": \"Jésus\", \"options\": [\"Pierre\", \"Jésus\", \"Paul\", \"Jean\"], \"reference\": \"Jean 14:6\"}]"
        ),
        "en": (
            "You are a Bible expert. Generate {n} 'Who said it?' questions in ENGLISH about '{topic}'. "
            "Each item must have: 'text' (the biblical quote), 'author' (correct answer), "
            "'options' (array of 4 names including the author), 'reference' (optional verse). "
            "Reply ONLY with a valid JSON array. "
            "Example: [{\"text\": \"I am the way\", \"author\": \"Jesus\", \"options\": [\"Peter\", \"Jesus\", \"Paul\", \"John\"], \"reference\": \"John 14:6\"}]"
        ),
    },
    "chrono_versets": {
        "fr": (
            "Tu es un expert en Bible. Génère {n} exercices 'Complétez le verset' en FRANÇAIS sur le thème '{topic}'. "
            "Chaque item doit avoir : 'text' (le verset avec le mot manquant remplacé par '___'), "
            "'missing' (le mot exact à trouver), 'reference' (référence biblique). "
            "Réponds UNIQUEMENT avec un JSON array valide. "
            "Exemple: [{\"text\": \"Car Dieu a tant ___ le monde\", \"missing\": \"aimé\", \"reference\": \"Jean 3:16\"}]"
        ),
        "en": (
            "You are a Bible expert. Generate {n} 'Complete the verse' exercises in ENGLISH about '{topic}'. "
            "Each item must have: 'text' (the verse with missing word replaced by '___'), "
            "'missing' (the exact word), 'reference' (Bible reference). "
            "Reply ONLY with a valid JSON array. "
            "Example: [{\"text\": \"For God so ___ the world\", \"missing\": \"loved\", \"reference\": \"John 3:16\"}]"
        ),
    },
    "anagrammes": {
        "fr": (
            "Tu es un expert en Bible. Génère {n} anagrammes de personnages ou lieux bibliques en FRANÇAIS sur le thème '{topic}'. "
            "Chaque item doit avoir : 'word' (le mot mélangé), 'answer' (le mot original), 'hint' (un indice court). "
            "Mélange bien les lettres ! "
            "Réponds UNIQUEMENT avec un JSON array valide. "
            "Exemple: [{\"word\": \"SEUJ\", \"answer\": \"JÉSUS\", \"hint\": \"Fils de Dieu\"}]"
        ),
        "en": (
            "You are a Bible expert. Generate {n} anagrams of biblical characters or places in ENGLISH about '{topic}'. "
            "Each item must have: 'word' (scrambled word), 'answer' (original word), 'hint' (short clue). "
            "Mix the letters well! "
            "Reply ONLY with a valid JSON array. "
            "Example: [{\"word\": \"SSUEJ\", \"answer\": \"JESUS\", \"hint\": \"Son of God\"}]"
        ),
    },
}

DEFAULT_TOPICS = {
    "vrai_faux": {"fr": "la vie de Jésus et les miracles", "en": "the life of Jesus and miracles"},
    "qui_a_dit": {"fr": "les apôtres et prophètes", "en": "apostles and prophets"},
    "chrono_versets": {"fr": "les versets célèbres", "en": "famous verses"},
    "anagrammes": {"fr": "personnages bibliques", "en": "biblical characters"},
}


def _parse_json_response(text: str) -> list:
    text = text.strip()
    # Remove markdown code blocks if present
    text = re.sub(r"```(?:json)?", "", text).strip("` \n")
    # Find first [ ... ] array
    start = text.find("[")
    end = text.rfind("]")
    if start == -1 or end == -1:
        raise ValueError("No JSON array found in response")
    return json.loads(text[start:end + 1])


def _normalize_question(item: dict, category: str, lang: str) -> dict:
    """Normalize AI response to a consistent format."""
    base = {
        "question_id": f"aq_{uuid.uuid4().hex[:12]}",
        "category": category,
        "lang": lang,
        "approved": False,
        "source": "ai",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "reference": item.get("reference", ""),
    }

    if category == "vrai_faux":
        answer = item.get("answer", False)
        if isinstance(answer, str):
            answer = answer.lower() in ("true", "vrai", "oui", "yes")
        base.update({"text": item.get("text", ""), "answer": answer, "options": None})

    elif category == "qui_a_dit":
        base.update({
            "text": item.get("text", ""),
            "answer": item.get("author", ""),
            "options": item.get("options", []),
        })

    elif category == "chrono_versets":
        base.update({
            "text": item.get("text", ""),
            "answer": item.get("missing", ""),
            "options": None,
        })

    elif category == "anagrammes":
        base.update({
            "text": item.get("word", ""),
            "answer": item.get("answer", ""),
            "options": [item.get("hint", "")],
        })

    return base


# ── Check if current user is admin ──────────────────────────────────
@router.get("/me")
async def admin_check(request: Request, authorization: Optional[str] = Header(None)):
    user = await get_admin_user(request, authorization)
    return {"is_admin": True, "email": user.email, "name": user.name}


# ── Generate questions with GPT-4o ───────────────────────────────────
@router.post("/generate")
async def generate_questions(
    gen_req: GenerateQuestionsRequest,
    request: Request,
    authorization: Optional[str] = Header(None),
):
    await get_admin_user(request, authorization)

    category = gen_req.category
    if category not in PROMPTS:
        raise HTTPException(status_code=400, detail=f"Catégorie inconnue: {category}")

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Clé LLM non configurée")

    langs_to_generate = ["fr", "en"] if gen_req.lang == "both" else [gen_req.lang]
    all_questions = []

    for lang in langs_to_generate:
        topic = gen_req.topic or DEFAULT_TOPICS.get(category, {}).get(lang, "la Bible")
        prompt_template = PROMPTS[category][lang]
        prompt = prompt_template.format(n=gen_req.num_questions, topic=topic)

        # chat = LlmChat(
        #     api_key=api_key,
        #     session_id=f"admin_gen_{uuid.uuid4().hex[:8]}",
        #     system_message="Tu es un expert en Bible qui génère des questions pédagogiques de haute qualité.",
        # ).with_model("openai", "gpt-4o")

        # response = await chat.send_message(UserMessage(text=prompt))
        response = {}

        try:
            items = _parse_json_response(response)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Erreur parsing réponse GPT-4o ({lang}): {str(e)}. Réponse: {response[:200]}"
            )

        for item in items:
            all_questions.append(_normalize_question(item, category, lang))

    return {"questions": all_questions, "total": len(all_questions)}


# ── List saved questions ─────────────────────────────────────────────
@router.get("/questions")
async def list_questions(
    request: Request,
    category: Optional[str] = None,
    lang: Optional[str] = None,
    approved: Optional[bool] = None,
    authorization: Optional[str] = Header(None),
):
    await get_admin_user(request, authorization)

    query = {}
    if category:
        query["category"] = category
    if lang:
        query["lang"] = lang
    if approved is not None:
        query["approved"] = approved

    questions = await db.admin_questions.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"questions": questions, "total": len(questions)}


# ── Save / update a question ─────────────────────────────────────────
@router.post("/questions")
async def save_question(
    req: SaveQuestionRequest,
    request: Request,
    authorization: Optional[str] = Header(None),
):
    await get_admin_user(request, authorization)

    doc = req.dict()
    if not doc.get("question_id"):
        doc["question_id"] = f"aq_{uuid.uuid4().hex[:12]}"
    doc["created_at"] = datetime.now(timezone.utc).isoformat()

    await db.admin_questions.update_one(
        {"question_id": doc["question_id"]},
        {"$set": doc},
        upsert=True,
    )
    return {"question_id": doc["question_id"], "message": "Question sauvegardée"}


# ── Bulk save (from generate) ────────────────────────────────────────
@router.post("/questions/bulk")
async def bulk_save_questions(
    request: Request,
    authorization: Optional[str] = Header(None),
):
    await get_admin_user(request, authorization)
    body = await request.json()
    questions = body.get("questions", [])
    if not questions:
        raise HTTPException(status_code=400, detail="Aucune question fournie")

    saved = 0
    for q in questions:
        if not q.get("question_id"):
            q["question_id"] = f"aq_{uuid.uuid4().hex[:12]}"
        q["created_at"] = datetime.now(timezone.utc).isoformat()
        await db.admin_questions.update_one(
            {"question_id": q["question_id"]},
            {"$set": q},
            upsert=True,
        )
        saved += 1
    return {"saved": saved, "message": f"{saved} questions sauvegardées"}


# ── Approve / reject ─────────────────────────────────────────────────
@router.patch("/questions/{question_id}/approve")
async def approve_question(
    question_id: str,
    request: Request,
    authorization: Optional[str] = Header(None),
):
    await get_admin_user(request, authorization)
    body = await request.json()
    approved = body.get("approved", True)
    result = await db.admin_questions.update_one(
        {"question_id": question_id}, {"$set": {"approved": approved}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Question non trouvée")
    return {"question_id": question_id, "approved": approved}


# ── Delete ────────────────────────────────────────────────────────────
@router.delete("/questions/{question_id}")
async def delete_question(
    question_id: str,
    request: Request,
    authorization: Optional[str] = Header(None),
):
    await get_admin_user(request, authorization)
    result = await db.admin_questions.delete_one({"question_id": question_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Question non trouvée")
    return {"message": "Question supprimée"}


# ── Stats ─────────────────────────────────────────────────────────────
@router.get("/stats")
async def admin_stats(request: Request, authorization: Optional[str] = Header(None)):
    await get_admin_user(request, authorization)
    total = await db.admin_questions.count_documents({})
    approved = await db.admin_questions.count_documents({"approved": True})
    by_category = {}
    for cat in PROMPTS.keys():
        by_category[cat] = {
            "total": await db.admin_questions.count_documents({"category": cat}),
            "approved": await db.admin_questions.count_documents({"category": cat, "approved": True}),
        }
    return {"total": total, "approved": approved, "by_category": by_category}


# ── Make a user admin (by email) ──────────────────────────────────────
@router.post("/promote")
async def promote_user(request: Request, authorization: Optional[str] = Header(None)):
    await get_admin_user(request, authorization)
    body = await request.json()
    email = body.get("email", "").lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email requis")
    result = await db.users.update_one({"email": email}, {"$set": {"is_admin": True, "role": "admin"}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return {"message": f"{email} est maintenant admin"}

# =====================================================================
# MODULE 1: USER MANAGEMENT
# =====================================================================

@router.get("/users")
async def list_users(
    request: Request, 
    page: int = 1, 
    limit: int = 50, 
    search: str = "",
    authorization: Optional[str] = Header(None)
):
    await get_admin_user(request, authorization)
    
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"user_id": {"$regex": search, "$options": "i"}}
        ]
        
    skip = (page - 1) * limit
    total = await db.users.count_documents(query)
    users_cursor = db.users.find(query, {"_id": 0, "google_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    users = await users_cursor.to_list(length=limit)
    
    return {"users": users, "total": total, "page": page, "pages": (total // limit) + (1 if total % limit > 0 else 0)}


@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    """Update a user's status (active, banned, timeout)"""
    await get_admin_user(request, authorization)
    body = await request.json()
    new_status = body.get("status")
    
    if new_status not in ["active", "banned", "timeout"]:
        raise HTTPException(status_code=400, detail="Statut invalide")
        
    result = await db.users.update_one({"user_id": user_id}, {"$set": {"status": new_status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
    # TODO: Automatically disconnect user from socket if banned/timeout
    return {"message": f"Statut mis à jour sur {new_status}"}


@router.patch("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    await get_admin_user(request, authorization)
    body = await request.json()
    new_role = body.get("role")
    
    if new_role not in ["user", "moderator", "admin"]:
        raise HTTPException(status_code=400, detail="Rôle invalide")
        
    is_admin = new_role == "admin"
    result = await db.users.update_one({"user_id": user_id}, {"$set": {"role": new_role, "is_admin": is_admin}})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return {"message": f"Rôle mis à jour sur {new_role}"}


@router.get("/users/{user_id}/audit")
async def get_user_audit(
    user_id: str,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    await get_admin_user(request, authorization)
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "google_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
    recent_matches = await db.duo_matches.find({
        "$or": [{"player1_id": user_id}, {"player2_id": user_id}]
    }, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    
    recent_transactions = await db.transactions.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "user": user,
        "recent_matches": recent_matches,
        "recent_transactions": recent_transactions
    }


# =====================================================================
# MODULE 3: ECONOMY & PREMIUM
# =====================================================================

@router.get("/economy/stats")
async def get_economy_stats(request: Request, authorization: Optional[str] = Header(None)):
    await get_admin_user(request, authorization)
    
    # 1. Total Revenue (Sum of all successful 'subscription' transactions)
    pipeline = [
        {"$match": {"status": "completed", "type": "subscription"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    cursor = db.transactions.aggregate(pipeline)
    result = await cursor.to_list(length=1)
    revenue = result[0]["total"] if result else 0.0
    
    # 2. Premium counts
    premium_count = await db.users.count_documents({"is_premium": True})
    
    # 3. Recent 24h transactions count
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    daily_tx_count = await db.transactions.count_documents({"created_at": {"$gte": yesterday.isoformat()}})
    
    return {
        "revenue": round(revenue, 2),
        "premium_users": premium_count,
        "daily_transactions": daily_tx_count,
        "currency": "USD"
    }


@router.get("/economy/transactions")
async def list_global_transactions(
    request: Request,
    page: int = 1,
    limit: int = 50,
    authorization: Optional[str] = Header(None)
):
    await get_admin_user(request, authorization)
    skip = (page - 1) * limit
    total = await db.transactions.count_documents({})
    
    tx_cursor = db.transactions.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    transactions = await tx_cursor.to_list(length=limit)
    
    return {"transactions": transactions, "total": total}


@router.post("/economy/grant-premium")
async def grant_premium_manually(request: Request, authorization: Optional[str] = Header(None)):
    await get_admin_user(request, authorization)
    body = await request.json()
    email = body.get("email")
    duration_days = body.get("days", 30)
    
    if not email:
        raise HTTPException(status_code=400, detail="Email requis")

    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
        
    expires_at = datetime.now(timezone.utc) + timedelta(days=int(duration_days))
    
    await db.users.update_one(
        {"email": email},
        {"$set": {
            "is_premium": True, 
            "premium_expires_at": expires_at.isoformat(),
            "role": "vip" if user.get("role") == "user" else user.get("role")
        }}
    )
    
    # Log the action as a manual transaction
    tx_id = f"manual_{uuid.uuid4().hex[:8]}"
    await db.transactions.insert_one({
        "transaction_id": tx_id,
        "user_id": user["user_id"],
        "user_email": email,
        "type": "manual_grant",
        "amount": 0,
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "notes": f"Granted {duration_days} days by admin"
    })
    
    return {"message": f"Premium accordé à {email} jusqu'au {expires_at.date()}"}


# =====================================================================
# MODULE 4: QUESTIONS MANAGEMENT (Excel Import / Export)
# =====================================================================
import io
import pandas as pd
from fastapi import UploadFile, File
from fastapi.responses import StreamingResponse

# Colonnes attendues dans le fichier Excel
EXCEL_COLUMNS = [
    "category",    # quiz_qui_a_dit | quiz_vrai_faux | chrono_versets | anagrammes | multiple_choice
    "type",        # biblique | santé | histoire | géographie | science | culture | autre
    "text",        # La question ou l'affirmation
    "answer",      # La bonne réponse
    "options",     # Les options séparées par | (ex: Paul|Jésus|Pierre|Marie)
    "reference",   # Référence biblique (ex: Jean 3:16)
    "lang",        # fr | en
    "difficulty",  # facile | moyen | difficile
    "book",        # Livre de la Bible (optionnel)
]

VALID_CATEGORIES = {
    "quiz_qui_a_dit", "quiz_vrai_faux", "chrono_versets",
    "anagrammes", "multiple_choice", "vrai_faux", "qui_a_dit"
}


@router.get("/questions/all")
async def list_all_questions(
    request: Request,
    category: Optional[str] = None,
    type: Optional[str] = None,
    lang: Optional[str] = None,
    search: Optional[str] = None,
    approved: Optional[bool] = None,
    page: int = 1,
    limit: int = 50,
    authorization: Optional[str] = Header(None),
):
    """List all questions from both admin_questions and questions collections."""
    await get_admin_user(request, authorization)

    query = {}
    if category:
        query["category"] = category
    if type:
        query["type"] = type
    if lang:
        query["lang"] = lang
    if approved is not None:
        query["approved"] = approved
    if search:
        query["$or"] = [
            {"text": {"$regex": search, "$options": "i"}},
            {"reference": {"$regex": search, "$options": "i"}},
            {"answer": {"$regex": search, "$options": "i"}},
        ]

    skip = (page - 1) * limit
    total = await db.admin_questions.count_documents(query)
    questions = await db.admin_questions.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    return {"questions": questions, "total": total, "page": page}


@router.get("/questions/template")
async def download_questions_template(
    request: Request,
    authorization: Optional[str] = Header(None),
):
    """Generate and return a pre-filled Excel template for question import."""
    await get_admin_user(request, authorization)

    # Create sample rows for each category
    sample_rows = [
        {
            "category": "quiz_vrai_faux",
            "type": "biblique",
            "text": "Jésus a transformé l'eau en vin à Cana",
            "answer": "True",
            "options": "",
            "reference": "Jean 2:1-11",
            "lang": "fr",
            "difficulty": "facile",
            "book": "Jean",
        },
        {
            "category": "quiz_qui_a_dit",
            "type": "biblique",
            "text": "Je suis le chemin, la vérité et la vie",
            "answer": "Jésus",
            "options": "Pierre|Jésus|Paul|Jean",
            "reference": "Jean 14:6",
            "lang": "fr",
            "difficulty": "facile",
            "book": "Jean",
        },
        {
            "category": "chrono_versets",
            "type": "biblique",
            "text": "Car Dieu a tant ___ le monde",
            "answer": "aimé",
            "options": "",
            "reference": "Jean 3:16",
            "lang": "fr",
            "difficulty": "facile",
            "book": "Jean",
        },
        {
            "category": "anagrammes",
            "type": "biblique",
            "text": "SEUJ",
            "answer": "JÉSUS",
            "options": "Fils de Dieu",
            "reference": "",
            "lang": "fr",
            "difficulty": "moyen",
            "book": "",
        },
        {
            "category": "multiple_choice",
            "type": "histoire",
            "text": "Combien Jésus avait-il d'apôtres ?",
            "answer": "12",
            "options": "10|11|12|13",
            "reference": "Matthieu 10:1-4",
            "lang": "fr",
            "difficulty": "facile",
            "book": "Matthieu",
        },
    ]

    df = pd.DataFrame(sample_rows, columns=EXCEL_COLUMNS)

    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Questions")

        # Style the header row
        ws = writer.sheets["Questions"]
        for col_num, col_name in enumerate(EXCEL_COLUMNS, 1):
            cell = ws.cell(row=1, column=col_num)
            cell.font = cell.font.copy(bold=True)
            ws.column_dimensions[cell.column_letter].width = max(len(col_name) + 5, 18)

        # Add instructions sheet
        info_sheet = writer.book.create_sheet("Instructions")
        instructions = [
            ["GUIDE D'IMPORTATION - Dueloo Admin"],
            [""],
            ["COLONNES OBLIGATOIRES:"],
            ["category", "Catégorie : quiz_vrai_faux | quiz_qui_a_dit | chrono_versets | anagrammes | multiple_choice"],
            ["text", "La question, l'affirmation, le verset incomplet ou le mot brouillé"],
            ["answer", "La bonne réponse (True/False pour vrai_faux)"],
            [""],
            ["COLONNES OPTIONNELLES:"],
            ["type", "Type thématique : biblique (défaut) | santé | histoire | géographie | science | culture | morale | autre"],
            ["options", "Pour quiz_qui_a_dit et multiple_choice : séparez les options par le symbole |"],
            ["reference", "Référence biblique (ex: Jean 3:16)"],
            ["lang", "Langue : fr (défaut) ou en"],
            ["difficulty", "Difficulté : facile | moyen | difficile"],
            ["book", "Livre de la Bible"],
            [""],
            ["NOTES IMPORTANTES:"],
            ["- Pour quiz_vrai_faux : mettez True ou False dans la colonne answer"],
            ["- Pour chrono_versets : remplacez le mot manquant par ___ dans le texte"],
            ["- Pour anagrammes : mettez le mot brouillé dans text, l'original dans answer"],
            ["- Toutes les questions importées auront approved=False par défaut"],
            ["- Vous pourrez les approuver manuellement dans l'interface"],
            [""],
            ["TYPES DISPONIBLES:"],
            ["biblique", "Questions sur les textes, personnages et événements de la Bible"],
            ["santé", "Questions sur la santé, le bien-être et l'hygiène"],
            ["histoire", "Questions d'histoire générale ou chrétienne"],
            ["géographie", "Pays, villes, régions mentionnés dans la Bible ou dans le monde"],
            ["science", "Questions scientifiques ou naturelles"],
            ["culture", "Culture générale et traditions"],
            ["morale", "Valeurs, éthique, enseignements moraux"],
            ["autre", "Tout ce qui ne rentre pas dans les catégories ci-dessus"],
        ]
        for row_idx, row_data in enumerate(instructions, 1):
            for col_idx, value in enumerate(row_data, 1):
                info_sheet.cell(row=row_idx, column=col_idx, value=value)

    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=dueloo_questions_template.xlsx"},
    )


@router.post("/questions/import-excel")
async def import_questions_from_excel(
    request: Request,
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
):
    """Parse an Excel file and bulk-insert valid questions."""
    await get_admin_user(request, authorization)

    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Fichier invalide. Envoyez un fichier .xlsx ou .xls")

    contents = await file.read()
    try:
        df = pd.read_excel(io.BytesIO(contents), sheet_name="Questions")
    except Exception:
        try:
            df = pd.read_excel(io.BytesIO(contents))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Impossible de lire le fichier Excel : {str(e)}")

    # Normalize column names
    df.columns = [str(c).strip().lower() for c in df.columns]
    required = {"category", "text", "answer"}
    missing = required - set(df.columns)
    if missing:
        raise HTTPException(status_code=400, detail=f"Colonnes manquantes : {', '.join(missing)}")

    # Fill optional columns with defaults
    df["reference"] = df.get("reference", "").fillna("")
    df["lang"] = df.get("lang", "fr").fillna("fr")
    df["difficulty"] = df.get("difficulty", "moyen").fillna("moyen")
    df["type"] = df.get("type", "biblique").fillna("biblique")
    df["book"] = df.get("book", "").fillna("")
    df["options"] = df.get("options", "").fillna("").astype(str)

    inserted = 0
    skipped = 0
    errors = []

    for idx, row in df.iterrows():
        row_num = idx + 2  # accounting for header
        category = str(row.get("category", "")).strip().lower()
        text = str(row.get("text", "")).strip()
        answer = str(row.get("answer", "")).strip()

        if not category or not text or not answer:
            skipped += 1
            errors.append(f"Ligne {row_num}: category, text ou answer vide — ignorée")
            continue

        # Parse options
        raw_options = str(row.get("options", "")).strip()
        options = [o.strip() for o in raw_options.split("|") if o.strip()] if raw_options else None

        # Build normalized answer for vrai_faux
        if "vrai_faux" in category:
            answer_lower = answer.lower()
            if answer_lower in ("true", "vrai", "oui", "yes", "1"):
                answer = "true"
            elif answer_lower in ("false", "faux", "non", "no", "0"):
                answer = "false"

        doc = {
            "question_id": f"aq_{uuid.uuid4().hex[:12]}",
            "category": category,
            "type": str(row.get("type", "biblique")).strip().lower() or "biblique",
            "text": text,
            "answer": answer,
            "options": options,
            "reference": str(row.get("reference", "")).strip(),
            "lang": str(row.get("lang", "fr")).strip() or "fr",
            "difficulty": str(row.get("difficulty", "moyen")).strip() or "moyen",
            "book": str(row.get("book", "")).strip(),
            "approved": False,
            "source": "excel_import",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        await db.admin_questions.update_one(
            {"text": text, "category": category, "lang": doc["lang"]},
            {"$setOnInsert": doc},
            upsert=True,
        )
        inserted += 1

    return {
        "inserted": inserted,
        "skipped": skipped,
        "errors": errors[:10],  # Return at most 10 errors to avoid verbose response
        "message": f"{inserted} questions importées, {skipped} ignorées.",
    }

# =====================================================================
# MODULE 5: GAME MODES MANAGEMENT
# =====================================================================

@router.patch("/game-modes/{mode_id}")
async def update_game_mode(
    mode_id: str,
    request: Request,
    authorization: Optional[str] = Header(None)
):
    await get_admin_user(request, authorization)
    updates = await request.json()
    
    result = await db.game_modes.update_one(
        {"mode_id": mode_id},
        {"$set": updates}
    )
    
    if result.matched_count == 0:
        # Try finding by 'id' if 'mode_id' fails
        result = await db.game_modes.update_one(
            {"id": mode_id},
            {"$set": updates}
        )
        
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Mode de jeu non trouvé")
        
    return {"message": "Mode mis à jour", "mode_id": mode_id}

@router.put("/modes/mots_caches")
async def update_mots_caches_pool(
    request: Request,
    authorization: Optional[str] = Header(None)
):
    await get_admin_user(request, authorization)
    body = await request.json()
    word_pool = body.get("word_pool", "")
    
    await db.game_modes.update_one(
        {"mode_id": "mots_caches"},
        {"$set": {"word_pool": word_pool}}
    )
    
    return {"message": "Pool de mots mis à jour"}
