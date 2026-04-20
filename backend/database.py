import os
import logging
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME')

if not mongo_url:
    logger.error("MONGO_URL not found in environment variables!")
    # Fallback to a default if appropriate, or raise error
    raise KeyError("MONGO_URL must be set in .env")

if not db_name:
    logger.warning("DB_NAME not found in environment variables, defaulting to 'game'")
    db_name = 'game'

logger.info(f"Connecting to MongoDB at {mongo_url.split('@')[-1] if '@' in mongo_url else mongo_url}")

try:
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    logger.info(f"Database handle for '{db_name}' initialized.")
except Exception as e:
    logger.error(f"Failed to initialize MongoDB client: {e}")
    raise
