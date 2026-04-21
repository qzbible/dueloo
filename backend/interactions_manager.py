import os
import json
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

# Try to import redis, fallback to in-memory for portability
try:
    import redis
    import fakeredis
    
    REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
    if os.getenv("USE_FAKE_REDIS", "true").lower() == "true":
        redis_client = fakeredis.FakeRedis(decode_responses=True)
        logger.info("Using FakeRedis for interactions")
    else:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        logger.info(f"Connected to Redis at {REDIS_URL}")
except ImportError:
    logger.warning("Redis or fakeredis not found. Using primitive in-memory fallback.")
    class SimpleMemoryRedis:
        def __init__(self):
            self.data = {}
        def hincrby(self, key, field, amount=1):
            if key not in self.data: self.data[key] = {}
            val = self.data[key].get(field, 0)
            self.data[key][field] = val + amount
            return self.data[key][field]
        def hgetall(self, key):
            return self.data.get(key, {})
        def lpush(self, key, value):
            if key not in self.data: self.data[key] = []
            self.data[key].insert(0, value)
            if len(self.data[key]) > 100: self.data[key].pop()
        def lrange(self, key, start, end):
            return self.data.get(key, [])[start:end+1]
        def exists(self, key):
            return key in self.data
    redis_client = SimpleMemoryRedis()

class InteractionManager:
    @staticmethod
    def add_like(match_id: str, player_role: Optional[str] = None):
        """Increment like counter for a match or specific player in the match."""
        key = f"match:{match_id}:likes"
        field = player_role if player_role else "global"
        return redis_client.hincrby(key, field, 1)

    @staticmethod
    def get_likes(match_id: str) -> Dict[str, int]:
        """Get all likes for a match."""
        likes = redis_client.hgetall(f"match:{match_id}:likes")
        return {k: int(v) for k, v in likes.items()}

    @staticmethod
    def add_comment(match_id: str, user_id: str, user_name: str, text: str):
        """Add a comment to the match live feed."""
        comment = {
            "user_id": user_id,
            "user_name": user_name,
            "text": text[:200], # Basic length limit
            "timestamp": json.dumps(None) # placeholder for actual timestamp if needed
        }
        # For simplicity, we just use the text and user_name
        data = json.dumps({"name": user_name, "text": text, "uid": user_id})
        redis_client.lpush(f"match:{match_id}:comments", data)
        return json.loads(data)

    @staticmethod
    def get_comments(match_id: str, limit: int = 50) -> List[dict]:
        """Get recent comments."""
        comments = redis_client.lrange(f"match:{match_id}:comments", 0, limit - 1)
        return [json.loads(c) for c in comments]

    @staticmethod
    def record_reaction(match_id: str, reaction_type: str):
        """Track reaction counts (for history/analytics)."""
        redis_client.hincrby(f"match:{match_id}:reactions", reaction_type, 1)

interaction_manager = InteractionManager()
