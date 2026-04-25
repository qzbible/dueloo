import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from dotenv import load_dotenv

async def check_last_match():
    ROOT_DIR = Path(__file__).parent
    load_dotenv(ROOT_DIR / '.env')
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME', 'game')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    match = await db.duo_matches.find_one(sort=[("_id", -1)])
    if match:
        print("Latest Match in DB:")
        for k, v in match.items():
            if k != '_id':
                print(f"{k}: {v}")
    else:
        print("No matches found.")

if __name__ == "__main__":
    asyncio.run(check_last_match())
