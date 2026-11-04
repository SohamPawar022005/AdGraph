from __future__ import annotations

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..db import get_db
from ..services.chat_service import ask_permitgraph_copilot

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., max_length=4000, description="Message content")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User question or statement")
    history: List[ChatMessage] = Field(default_factory=list, description="Recent conversation turns")


class CitationItem(BaseModel):
    id: str
    title: str
    type: str
    url: str


class ChatResponse(BaseModel):
    reply: str
    provider: str
    model: str
    citations: List[CitationItem] = []
    suggestions: List[str] = []


@router.post("", response_model=ChatResponse)
def chat_copilot(payload: ChatRequest, db: Session = Depends(get_db)):
    """Conversational regulatory intelligence co-pilot.
    
    Supports Gemini API with automatic fallback to local Ollama and PermitGraph's
    deterministic rules engine.
    """
    try:
        history_dicts = [{"role": m.role, "content": m.content} for m in payload.history]
        result = ask_permitgraph_copilot(
            db=db,
            message=payload.message,
            history=history_dicts,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process chat query: {str(e)}")
