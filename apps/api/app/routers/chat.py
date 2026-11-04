from __future__ import annotations

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..db import get_db
from ..services.chat_service import (
    ask_permitgraph_copilot,
    stream_permitgraph_copilot,
    calculate_statutory_fees,
    audit_document_compliance,
)

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., max_length=4000, description="Message content")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User question or statement")
    history: List[ChatMessage] = Field(default_factory=list, description="Recent conversation turns")
    language: Optional[str] = Field("en", description="Language code: 'en' (English) or 'mr' (Marathi)")


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


class FeeCalculationRequest(BaseModel):
    investment_cr: float = Field(..., ge=0.01, le=50000.0, description="Capital investment in Crores INR")
    category: Optional[str] = Field("Orange", description="Pollution category: White, Green, Orange, Red")
    location: Optional[str] = Field("MIDC", description="MIDC or Non-MIDC")
    workers_count: Optional[int] = Field(50, ge=1, le=50000, description="Number of anticipated workers")


class DocumentAuditRequest(BaseModel):
    document_text: str = Field(..., min_length=10, max_length=20000, description="Text extracted from document/NOC/application")
    document_type: Optional[str] = Field("general", description="Document type tag")


@router.post("", response_model=ChatResponse)
def chat_copilot(payload: ChatRequest, db: Session = Depends(get_db)):
    """Conversational regulatory intelligence co-pilot (Non-streaming)."""
    try:
        history_dicts = [{"role": m.role, "content": m.content} for m in payload.history]
        result = ask_permitgraph_copilot(
            db=db,
            message=payload.message,
            history=history_dicts,
            language=payload.language or "en",
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process chat query: {str(e)}")


@router.post("/stream")
def chat_copilot_stream(payload: ChatRequest, db: Session = Depends(get_db)):
    """Server-Sent Events (SSE) streaming endpoint for real-time word-by-word token delivery."""
    try:
        history_dicts = [{"role": m.role, "content": m.content} for m in payload.history]
        generator = stream_permitgraph_copilot(
            db=db,
            message=payload.message,
            history=history_dicts,
            language=payload.language or "en",
        )
        return StreamingResponse(
            generator,
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stream chat: {str(e)}")


@router.post("/calculate-fees")
def calculate_fees(payload: FeeCalculationRequest):
    """Calculates official statutory fee schedule and approval timelines across Maharashtra agencies."""
    try:
        return calculate_statutory_fees(
            investment_cr=payload.investment_cr,
            category=payload.category or "Orange",
            location=payload.location or "MIDC",
            workers_count=payload.workers_count or 50,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate fees: {str(e)}")


@router.post("/audit-document")
def audit_document(payload: DocumentAuditRequest):
    """Audits draft NOC, applications, or inspection orders against Maharashtra gazette rules."""
    try:
        return audit_document_compliance(
            document_text=payload.document_text,
            document_type=payload.document_type or "general",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to audit document: {str(e)}")
