import os
import uuid
import json
import re
from fastapi import APIRouter, Request, Header, HTTPException
from typing import Optional, List
from datetime import datetime, timezone
from dotenv import load_dotenv

from database import db
from auth import get_admin_user, get_current_user
from models import GenerateQuestionsRequest, SaveQuestionRequest

load_dotenv()

from emergentintegrations.llm.chat import LlmChat, UserMessage

router = APIRouter(prefix="/admin", tags=["admin"])

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

        chat = LlmChat(
            api_key=api_key,
            session_id=f"admin_gen_{uuid.uuid4().hex[:8]}",
            system_message="Tu es un expert en Bible qui génère des questions pédagogiques de haute qualité.",
        ).with_model("openai", "gpt-4o")

        response = await chat.send_message(UserMessage(text=prompt))

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
    result = await db.users.update_one({"email": email}, {"$set": {"is_admin": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return {"message": f"{email} est maintenant admin"}
