import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

# Load env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'game')

async def seed():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    game_modes = [
        # Quiz et Tests
        {"mode_id": "quiz_qui_a_dit", "category": "Quiz et Tests", "name": "Qui a dit quoi ?", "description": "Attribuez chaque citation à son auteur biblique", "icon": "💬", "difficulty": "moyen", "duration_minutes": 5, "color": "from-blue-400 to-blue-600", "available": True},
        {"mode_id": "quiz_vrai_faux", "category": "Quiz et Tests", "name": "Vrai ou Faux", "description": "Affirmations rapides sur les miracles et événements", "icon": "✓✗", "difficulty": "facile", "duration_minutes": 3, "color": "from-green-400 to-emerald-600", "available": True},
        {"mode_id": "chrono_versets", "category": "Quiz et Tests", "name": "Chrono-Versets", "description": "Complétez un verset le plus vite possible", "icon": "⏱️", "difficulty": "moyen", "duration_minutes": 2, "color": "from-orange-400 to-orange-600", "available": True},
        
        # Jeux de Mots
        {"mode_id": "mots_caches", "category": "Jeux de Mots", "name": "Mots Cachés Bibliques", "description": "Trouvez les noms cachés", "icon": "🔤", "difficulty": "facile", "duration_minutes": 5, "color": "from-purple-400 to-purple-600", "available": True},
        {"mode_id": "anagrammes", "category": "Jeux de Mots", "name": "Anagrammes", "description": "Reconstituez les noms bibliques", "icon": "🔀", "difficulty": "moyen", "duration_minutes": 3, "color": "from-pink-400 to-pink-600", "available": True},
        
        # Strategie et Plateau
        {"mode_id": "echecs", "category": "Strategie et Plateau", "name": "Échecs", "description": "Le roi des jeux de stratégie - Contrôle et tactique", "icon": "♟️", "difficulty": "difficile", "duration_minutes": 20, "color": "from-slate-700 to-slate-900", "available": True},
        {"mode_id": "damier", "category": "Strategie et Plateau", "name": "Damier", "description": "Forcez les captures et créez des chaînes de prises", "icon": "⬛", "difficulty": "moyen", "duration_minutes": 15, "color": "from-gray-600 to-gray-800", "available": True},
        {"mode_id": "puissance4", "category": "Strategie et Plateau", "name": "Puissance 4", "description": "Alignez 4 jetons avant votre adversaire", "icon": "🔴", "difficulty": "facile", "duration_minutes": 5, "color": "from-red-400 to-red-600", "available": True},
        {"mode_id": "morpion", "category": "Strategie et Plateau", "name": "Morpion", "description": "Le classique indémodable du 3x3", "icon": "❌", "difficulty": "facile", "duration_minutes": 2, "color": "from-blue-500 to-blue-700", "available": True},
        {"mode_id": "othello", "category": "Strategie et Plateau", "name": "Othello", "description": "Une minute pour apprendre, une vie pour maîtriser", "icon": "⚫", "difficulty": "moyen", "duration_minutes": 10, "color": "from-emerald-700 to-emerald-900", "available": True},
        {"mode_id": "go", "category": "Strategie et Plateau", "name": "Go", "description": "Contrôlez le territoire dans ce jeu ancestral", "icon": "⚪", "difficulty": "très difficile", "duration_minutes": 30, "color": "from-zinc-400 to-zinc-600", "available": True},
        {"mode_id": "awale", "category": "Strategie et Plateau", "name": "Awalé", "description": "Le jeu de semailles africain", "icon": "🟤", "difficulty": "moyen", "duration_minutes": 10, "color": "from-orange-700 to-amber-900", "available": True},
        {"mode_id": "fanorona", "category": "Strategie et Plateau", "name": "Fanorona", "description": "Stratégie malgache de captures multiples", "icon": "🔶", "difficulty": "difficile", "duration_minutes": 15, "color": "from-orange-400 to-orange-600", "available": True},
        {"mode_id": "zamma", "category": "Strategie et Plateau", "name": "Zamma", "description": "Variante sahélienne intense du damier", "icon": "🔷", "difficulty": "difficile", "duration_minutes": 20, "color": "from-blue-400 to-blue-600", "available": True},

        # Cartes
        {"mode_id": "uno", "category": "Cartes", "name": "UNO", "description": "Débarrassez-vous de vos cartes au bon moment", "icon": "🎴", "difficulty": "facile", "duration_minutes": 10, "color": "from-red-500 via-yellow-500 to-green-500", "available": True},
        {"mode_id": "belote", "category": "Cartes", "name": "Belote / Coinche", "description": "Jeu de plis en équipe - Stratégie et atouts", "icon": "🂡", "difficulty": "difficile", "duration_minutes": 15, "color": "from-blue-600 to-indigo-800", "available": True},
        {"mode_id": "poker", "category": "Cartes", "name": "Poker", "description": "Bluff, probabilités et psychologie", "icon": "♠️", "difficulty": "difficile", "duration_minutes": 20, "color": "from-gray-800 to-black", "available": True},
        {"mode_id": "bataille", "category": "Cartes", "name": "Bataille", "description": "Le duel de cartes le plus simple", "icon": "🃏", "difficulty": "facile", "duration_minutes": 5, "color": "from-red-700 to-red-900", "available": True},
        {"mode_id": "rami", "category": "Cartes", "name": "Rami", "description": "Formez des suites et des brelans", "icon": "🧩", "difficulty": "moyen", "duration_minutes": 15, "color": "from-cyan-600 to-cyan-800", "available": True},

        # Arcade et Action
        {"mode_id": "snake", "category": "Arcade et Action", "name": "Snake", "description": "Mangez et devenez le plus long possible", "icon": "🐍", "difficulty": "facile", "duration_minutes": 5, "color": "from-green-500 to-green-700", "available": True},
        {"mode_id": "agario", "category": "Arcade et Action", "name": "Agar.io-like", "description": "Mangez les plus petits, fuyez les plus gros", "icon": "⚪", "difficulty": "moyen", "duration_minutes": 5, "color": "from-purple-500 to-indigo-600", "available": True},
        {"mode_id": "course", "category": "Arcade et Action", "name": "Course", "description": "Trajectoire optimale sur piste 2D", "icon": "🏎️", "difficulty": "moyen", "duration_minutes": 3, "color": "from-red-500 to-orange-600", "available": True},
        {"mode_id": "football", "category": "Arcade et Action", "name": "Football 2D", "description": "Marquez contre l'adversaire", "icon": "⚽", "difficulty": "facile", "duration_minutes": 5, "color": "from-green-400 to-emerald-600", "available": True},
        {"mode_id": "combat", "category": "Arcade et Action", "name": "Combat", "description": "Timing et réflexes en duel", "icon": "🥊", "difficulty": "moyen", "duration_minutes": 3, "color": "from-zinc-500 to-zinc-700", "available": True},
        {"mode_id": "tower_defense", "category": "Arcade et Action", "name": "Tower Defense", "description": "Protégez votre château contre les vagues", "icon": "🏰", "difficulty": "difficile", "duration_minutes": 15, "color": "from-amber-600 to-amber-800", "available": True},

        # Éducatif
        {"mode_id": "skribbl", "category": "Éducatif", "name": "Skribbl-like", "description": "Dessinez et devinez les mots bibliques", "icon": "🎨", "difficulty": "facile", "duration_minutes": 10, "color": "from-yellow-400 to-orange-500", "available": True},
        {"mode_id": "memory_biblique", "category": "Éducatif", "name": "Memory Biblique", "description": "Trouvez les paires de symboles", "icon": "🧠", "difficulty": "facile", "duration_minutes": 5, "color": "from-teal-400 to-teal-600", "available": True},
        
        # Legacy / Special
        {"mode_id": "la_manne", "category": "Rapidité", "name": "La Manne du Ciel", "description": "Attrapez les bénédictions", "icon": "🍞", "difficulty": "facile", "duration_minutes": 2, "color": "from-yellow-400 to-yellow-600", "available": True},
        {"mode_id": "tri_livres", "category": "Rapidité", "name": "Tri de Livres", "description": "Classez: Ancien vs Nouveau Testament", "icon": "📚", "difficulty": "facile", "duration_minutes": 3, "color": "from-indigo-400 to-indigo-600", "available": True},
        {"mode_id": "labyrinthe_exode", "category": "Logique", "name": "Labyrinthe de l'Exode", "description": "Guidez le peuple vers la Terre Promise", "icon": "🗺️", "difficulty": "moyen", "duration_minutes": 5, "color": "from-amber-400 to-amber-600", "available": True},
        {"mode_id": "brebis_perdue", "category": "Défis Flash", "name": "Trouver la Brebis", "description": "Retrouvez la brebis égarée", "icon": "🐑", "difficulty": "facile", "duration_minutes": 1, "color": "from-lime-400 to-lime-600", "available": True},
        {"mode_id": "multiplier_pains", "category": "Défis Flash", "name": "Multiplier les Pains", "description": "Cliquez vite pour nourrir la foule", "icon": "🍞", "difficulty": "facile", "duration_minutes": 1, "color": "from-rose-400 to-rose-600", "available": True},
        {"mode_id": "blind_test", "category": "Éducatif", "name": "Blind Test des Cantiques", "description": "Reconnaissez les hymnes", "icon": "🎵", "difficulty": "moyen", "duration_minutes": 10, "color": "from-cyan-400 to-cyan-600", "available": True},
        {"mode_id": "voyage_paul", "category": "Arcade et Action", "name": "Le Voyage de Paul", "description": "Suivez les missions de l'apôtre Paul", "icon": "⛵", "difficulty": "difficile", "duration_minutes": 15, "color": "from-violet-400 to-violet-600", "available": True}
    ]

    print(f"Total modes to seed: {len(game_modes)}")
    
    # Simple strategy: clear and re-insert or update
    # Here I'll just clear and insert to ensure categories are updated correctly
    await db.game_modes.delete_many({})
    await db.game_modes.insert_many(game_modes)
    
    print("Database seeded with new game modes.")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed())
