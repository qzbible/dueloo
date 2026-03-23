from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone


class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str = ""
    email: str = ""
    name: str = ""
    picture: str = ""
    google_id: str = ""
    level: int = 1
    xp: int = 0
    lives: int = 5
    coins: int = 100
    is_premium: bool = False
    premium_expires_at: Optional[Any] = None
    mmr: int = 1000
    created_at: Any = ""
    is_admin: bool = False


class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str = ""
    session_token: str = ""
    created_at: Any = ""
    expires_at: Any = ""


class Question(BaseModel):
    model_config = ConfigDict(extra="ignore")
    question_id: str = ""
    text: str
    options: List[str]
    correct_answer: int
    category: str = "general"
    difficulty: str = "medium"
    book: str = ""
    chapter: int = 0


class UserProgress(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    book: str
    score: int = 0
    completed: bool = False
    last_played: str = ""


class Badge(BaseModel):
    model_config = ConfigDict(extra="ignore")
    badge_id: str
    name: str
    description: str
    icon: str
    condition_type: str
    condition_value: int = 1


class UserBadge(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    badge_id: str
    earned_at: str = ""


class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    transaction_id: str = ""
    user_id: str
    amount: float
    currency: str = "usd"
    status: str = "pending"
    stripe_session_id: str = ""
    package_type: str = ""
    created_at: str = ""
    completed_at: str = ""


class DailyManna(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    date: str
    completed: bool = False
    streak: int = 0


class GameStartRequest(BaseModel):
    mode_id: str
    lang: str = "fr"


class GameSubmitRequest(BaseModel):
    session_id: str
    answers: Dict[str, Any]


class CheckoutRequest(BaseModel):
    package_type: str
    success_url: str
    cancel_url: str


class DuoMatchRequest(BaseModel):
    mode: str = "friend"
    theme: Optional[str] = None
    friend_code: Optional[str] = None


class CreateGroupSessionRequest(BaseModel):
    name: str = "Session BibleQuest"
    category: Optional[str] = None
    num_questions: int = 10
    max_players: int = 20


class JoinGroupRequest(BaseModel):
    pin_code: str
    player_name: str


class AdminQuestion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    question_id: str = ""
    category: str
    lang: str
    text: str
    answer: Any
    options: Optional[List[str]] = None
    reference: Optional[str] = None
    approved: bool = False
    created_at: str = ""
    source: str = "ai"


class GenerateQuestionsRequest(BaseModel):
    category: str
    lang: str = "both"
    num_questions: int = 5
    topic: Optional[str] = None


class SaveQuestionRequest(BaseModel):
    question_id: Optional[str] = None
    category: str
    lang: str
    text: str
    answer: Any
    options: Optional[List[str]] = None
    reference: Optional[str] = None
    approved: bool = True
    source: str = "ai"
