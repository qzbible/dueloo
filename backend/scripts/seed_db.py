import os
import asyncio
import uuid
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

# Load env
ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'dueloo_db')

async def seed():
    if not mongo_url:
        print("MONGO_URL not set. Skipping seeding.")
        return

    print(f"Connecting to MongoDB at {mongo_url.split('@')[-1] if '@' in mongo_url else 'localhost'}...")
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # 1. Seed Game Modes (Idempotent)
    game_modes = [
        # Quiz et Tests
        {"mode_id": "quiz_qui_a_dit", "category": "Quiz et Tests", "name": "Qui a dit quoi ?", "description": "Attribuez chaque citation à son auteur biblique", "icon": "💬", "difficulty": "moyen", "available": True, "color": "from-blue-400 to-blue-600"},
        {"mode_id": "quiz_vrai_faux", "category": "Quiz et Tests", "name": "Vrai ou Faux", "description": "Affirmations rapides sur les miracles et événements", "icon": "✓✗", "difficulty": "facile", "available": True, "color": "from-green-400 to-emerald-600"},
        {"mode_id": "chrono_versets", "category": "Quiz et Tests", "name": "Chrono-Versets", "description": "Complétez un verset le plus vite possible", "icon": "⏱️", "difficulty": "moyen", "available": True, "color": "from-orange-400 to-orange-600"},
        
        # Jeux de Mots
        {"mode_id": "mots_caches", "category": "Jeux de Mots", "name": "Mots Cachés Bibliques", "description": "Trouvez les noms cachés", "icon": "🔤", "difficulty": "facile", "available": True, "color": "from-purple-400 to-purple-600"},
        {"mode_id": "anagrammes", "category": "Jeux de Mots", "name": "Anagrammes", "description": "Reconstituez les noms bibliques", "icon": "🔀", "difficulty": "moyen", "available": True, "color": "from-pink-400 to-pink-600"},
        
        # Strategie et Plateau
        {"mode_id": "echecs", "category": "Strategie et Plateau", "name": "Échecs", "description": "Le roi des jeux de stratégie - Contrôle et tactique", "icon": "♟️", "difficulty": "difficile", "available": True, "color": "from-slate-700 to-slate-900"},
        {"mode_id": "othello", "category": "Strategie et Plateau", "name": "Othello", "description": "Une minute pour apprendre, une vie pour maîtriser", "icon": "⚫", "difficulty": "moyen", "available": True, "color": "from-emerald-700 to-emerald-900"},
        {"mode_id": "morpion", "category": "Strategie et Plateau", "name": "Morpion", "description": "Le classique indémodable du 3x3", "icon": "❌", "difficulty": "facile", "available": True, "color": "from-blue-500 to-blue-700"},
        {"mode_id": "puissance4", "category": "Strategie et Plateau", "name": "Puissance 4", "description": "Alignez 4 jetons avant votre adversaire", "icon": "🔴", "difficulty": "facile", "available": True, "color": "from-red-400 to-red-600"},
        
        # Arcade et Action
        {"mode_id": "snake", "category": "Arcade et Action", "name": "Snake", "description": "Mangez et devenez le plus long possible", "icon": "🐍", "difficulty": "facile", "available": True, "color": "from-green-500 to-green-700"},
        {"mode_id": "football", "category": "Arcade et Action", "name": "Football 2D", "description": "Marquez contre l'adversaire", "icon": "⚽", "difficulty": "facile", "available": True, "color": "from-green-400 to-emerald-600"},
    ]

    for mode in game_modes:
        await db.game_modes.update_one(
            {"mode_id": mode["mode_id"]},
            {"$set": mode},
            upsert=True
        )
    print(f"Seeded {len(game_modes)} game modes.")

    # 2. Seed Sample Questions (Idempotent)
    if await db.questions.count_documents({}) == 0:
        sample_questions = [
            {"question_id": f"q_{uuid.uuid4().hex[:8]}", "book": "Genèse", "chapter": 1, "text": "Combien de jours Dieu a-t-il pris pour créer le monde ?", "options": ["5 jours", "6 jours", "7 jours", "8 jours"], "correct_answer": 1, "difficulty": "facile"},
            {"question_id": f"q_{uuid.uuid4().hex[:8]}", "book": "Genèse", "chapter": 1, "text": "Qu'a créé Dieu le premier jour ?", "options": ["Les animaux", "La lumière", "Les plantes", "L'homme"], "correct_answer": 1, "difficulty": "facile"},
            {"question_id": f"q_{uuid.uuid4().hex[:8]}", "book": "Exode", "chapter": 20, "text": "Combien de commandements Dieu a-t-il donnés à Moïse ?", "options": ["5", "10", "12", "7"], "correct_answer": 1, "difficulty": "facile"},
        ]
        await db.questions.insert_many(sample_questions)
        print(f"Seeded {len(sample_questions)} sample questions.")

    # 3. Seed Master Admin (Idempotent)
    admin_email = "samyfabiol@gmail.com"
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        await db.users.insert_one({
            "user_id": "user_admin_master",
            "email": admin_email,
            "name": "Super Admin",
            "is_admin": True,
            "role": "admin",
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "xp": 0,
            "level": 1,
            "coins": 1000,
            "lives": 5
        })
        print(f"Master admin created: {admin_email}")

    # 4. Seed Badges (Idempotent)
    badges = [
        {"badge_id": "badge_polyglotte", "name": "Polyglotte", "description": "Jouer dans deux langues différentes", "icon": "🌍", "condition_type": "langs_played", "condition_value": 2},
        {"badge_id": "badge_fidele", "name": "Fidèle", "description": "Se connecter 7 jours de suite", "icon": "📅", "condition_type": "streak", "condition_value": 7},
    ]
    for badge in badges:
        await db.badges.update_one(
            {"badge_id": badge["badge_id"]},
            {"$set": badge},
            upsert=True
        )
    print(f"Seeded {len(badges)} badges.")

    print("Database seeding completed.")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed())
