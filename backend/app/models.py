from pydantic import BaseModel
from typing import List, Optional

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str
    source: str
    matched_question: Optional[str] = None
    similarity_score: Optional[float] = None
    top_matches: Optional[List[dict]] = None

class FAQ(BaseModel):   # ✅ Add this
    question: str
    answer: str
