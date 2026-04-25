from fastapi import APIRouter, HTTPException, Request, Header
from typing import Optional
from datetime import datetime, timezone
import uuid
import random
from database import db
from models import GameStartRequest, GameSubmitRequest
from auth import get_current_user
from i18n_content import (
    get_quiz_qui_a_dit, get_quiz_vrai_faux, get_chrono_versets,
    get_mots_caches, get_anagrammes, get_labyrinthe_questions
)
from game_utils import generate_word_search_grid, generate_maze, calculate_score

router = APIRouter(prefix="/api")


@router.get("/game-modes")
async def get_game_modes(category: Optional[str] = None):
    query = {"available": True}
    if category:
        query["category"] = category
    modes = await db.game_modes.find(query, {"_id": 0}).to_list(100)
    return modes


@router.get("/game-modes/categories")
async def get_game_categories():
    pipeline = [{"$group": {"_id": "$category", "count": {"$sum": 1}}}, {"$sort": {"_id": 1}}]
    categories = await db.game_modes.aggregate(pipeline).to_list(20)
    return [{"name": c["_id"], "count": c["count"]} for c in categories]


@router.get("/questions/random")
async def get_random_questions(request: Request, authorization: Optional[str] = Header(None), book: Optional[str] = None, difficulty: Optional[str] = None, limit: int = 10):
    user = await get_current_user(request, authorization)
    query = {}
    if book:
        query["book"] = book
    if difficulty:
        query["difficulty"] = difficulty
    questions = await db.questions.find(query, {"_id": 0}).to_list(100)
    import random as rng
    rng.shuffle(questions)
    return questions[:limit]


@router.post("/games/start")
async def start_game(request: Request, game_request: GameStartRequest, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    mode = await db.game_modes.find_one({"mode_id": game_request.mode_id}, {"_id": 0})
    if not mode:
        raise HTTPException(status_code=404, detail="Mode de jeu non trouvé")
    if not mode.get("available", False):
        raise HTTPException(status_code=403, detail="Ce mode n'est pas encore disponible")
    
    # Check if this is an existing match that already has game_data
    match_id = (game_request.config or {}).get("match_id")
    existing_match = None
    if match_id:
        existing_match = await db.duo_matches.find_one({"match_id": match_id})
        if existing_match and existing_match.get("game_data"):
            game_data = existing_match["game_data"]
        else:
            game_data = await generate_game_data(game_request.mode_id, game_request.lang, game_request.config)
    else:
        game_data = await generate_game_data(game_request.mode_id, game_request.lang, game_request.config)
    
    session = {
        "session_id": f"game_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "mode_id": game_request.mode_id,
        "game_data": game_data,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed": False,
        "lang": game_request.lang,
        "config": game_request.config
    }
    
    # Create or update match record
    if not match_id:
        match_id = f"s_{uuid.uuid4().hex[:8]}"
        is_ai = (game_request.config or {}).get("opponent", "ia") == "ia"
        match_doc = {
            "match_id": match_id,
            "mode_id": game_request.mode_id,
            "player1_id": user.user_id,
            "player1_name": user.name,
            "player1_score": 0,
            "player2_id": "ia" if is_ai else None,
            "player2_name": "IA Expert" if is_ai else "Anonyme",
            "player2_score": 0,
            "status": "playing",
            "game_data": game_data,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_solo": True
        }
        await db.duo_matches.insert_one(match_doc)
        session["match_id"] = match_id
    elif not (existing_match and existing_match.get("game_data")):
        # First player starting the duo match or generating state
        await db.duo_matches.update_one(
            {"match_id": match_id},
            {"$set": {"game_data": game_data}}
        )

    await db.game_sessions.insert_one(session)
    return {"session_id": session["session_id"], "match_id": session.get("match_id"), "game_data": game_data}


async def generate_game_data(mode_id: str, lang: str = "fr", config: Optional[dict] = None):
    if mode_id == "quiz_qui_a_dit":
        return get_quiz_qui_a_dit(lang)
    elif mode_id == "quiz_vrai_faux":
        return get_quiz_vrai_faux(lang)
    elif mode_id == "chrono_versets":
        return get_chrono_versets(lang)
    elif mode_id == "mots_caches":
        difficulty = (config or {}).get("difficulty", "facile")
        
        # Difficulty settings
        settings = {
            "facile": {"size": 12, "count": 20},
            "moyen": {"size": 15, "count": 30},
            "difficile": {"size": 20, "count": 50},
            "très difficile": {"size": 25, "count": 60}
        }
        conf = settings.get(difficulty, settings["facile"])
        grid_size = conf["size"]
        word_count = conf["count"]

        # Fetch word pool from DB
        mode_doc = await db.game_modes.find_one({"mode_id": "mots_caches"})
        pool_str = mode_doc.get("word_pool", "") if mode_doc else ""
        
        if pool_str:
            all_words = [w.strip().upper() for w in pool_str.split(",") if w.strip()]
            
            # Filter words that are too long for the current grid size
            eligible_words = [w for w in all_words if len(w) <= grid_size]
            
            if not eligible_words:
                # If no words fit (unlikely), fallback to some default words or a smaller slice
                eligible_words = ["BIBLE", "JESUS", "GRACE"]
                
            if len(eligible_words) > word_count:
                words = random.sample(eligible_words, word_count)
            else:
                words = eligible_words
        else:
            # Fallback to local file if DB pool is empty
            words = get_mots_caches(lang)[:word_count]

        grid_result = generate_word_search_grid(words, grid_size)
        return {"grid_size": grid_size, "words": words, "grid": grid_result["grid"], "placements": grid_result["placements"]}
    elif mode_id == "anagrammes":
        return get_anagrammes(lang)
    elif mode_id == "memory_biblique":
        symbols = ["✝️", "🕊️", "🍞", "🐟", "⚓", "🌟", "💒", "📖"]
        cards = []
        for symbol in symbols:
            cards.append({"id": f"{symbol}_1", "symbol": symbol})
            cards.append({"id": f"{symbol}_2", "symbol": symbol})
        random.shuffle(cards)
        return {"cards": cards}
    elif mode_id == "labyrinthe_exode":
        maze_data = generate_maze(15, 15)
        questions = get_labyrinthe_questions(lang)
        return {**maze_data, "questions": questions}
    elif mode_id == "skribbl":
        words = ["Arche", "Temple", "Croix", "Baleine", "Lion", "Pain", "Poisson", "Colombe", "Buisson", "Harpe"]
        return {"words": words}
    elif mode_id == "blind_test":
        songs = [
            {"id": 1, "title": "Grâce Infinie", "artist": "Traditionnel"},
            {"id": 2, "title": "Plus près de toi mon Dieu", "artist": "Traditionnel"},
            {"id": 3, "title": "Grand Dieu nous te bénissons", "artist": "Traditionnel"}
        ]
        return {"songs": songs}
    return {}


@router.get("/games/session/{session_id}")
async def get_game_session(session_id: str, request: Request, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    session = await db.game_sessions.find_one(
        {"session_id": session_id, "user_id": user.user_id, "completed": False},
        {"_id": 0}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée ou terminée")
    return {
        "session_id": session["session_id"],
        "game_data": session["game_data"],
        "mode_id": session["mode_id"],
        "created_at": session.get("created_at")
    }


@router.post("/games/submit")
async def submit_game(request: Request, submit_request: GameSubmitRequest, authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, authorization)
    session = await db.game_sessions.find_one({"session_id": submit_request.session_id, "user_id": user.user_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    score = calculate_score(session["mode_id"], session["game_data"], submit_request.answers)
    
    await db.game_sessions.update_one(
        {"session_id": submit_request.session_id},
        {"$set": {"completed": True, "score": score, "answers": submit_request.answers, "completed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Track language for polyglot badge
    lang = session.get("lang", "fr")
    await db.lang_tracking.update_one(
        {"user_id": user.user_id},
        {"$inc": {f"games_{lang}": 1}, "$set": {"last_played": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    xp_earned = score * 10
    coins_earned = score * 5
    await db.users.update_one({"user_id": user.user_id}, {"$inc": {"xp": xp_earned, "coins": coins_earned}})
    
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    new_level = 1 + (user_doc.get("xp", 0) // 100)
    if new_level != user_doc.get("level", 1):
        await db.users.update_one({"user_id": user.user_id}, {"$set": {"level": new_level}})
    
    return {"score": score, "xp_earned": xp_earned, "coins_earned": coins_earned, "new_level": new_level}
