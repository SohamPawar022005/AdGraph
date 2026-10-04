from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.changes import RegulatoryChange
from ..services import change_service

router = APIRouter(prefix="/api/v1/regulatory-changes", tags=["regulatory-changes"])


class AnalyzeRequest(BaseModel):
    old_sections: Dict[str, str]
    new_sections: Dict[str, str]
    old_source_document_id: Optional[str] = None
    new_source_document_id: Optional[str] = None
    is_synthetic: bool = False


def _payload(c: RegulatoryChange) -> dict:
    return {
        "id": c.id,
        "old_source_document_id": c.old_source_document_id,
        "new_source_document_id": c.new_source_document_id,
        "detected_at": c.detected_at,
        "change_type": c.change_type,
        "section_label": c.section_label,
        "old_text": c.old_text,
        "new_text": c.new_text,
        "affected_rule_ids": c.affected_rule_ids,
        "affected_approval_ids": c.affected_approval_ids,
        "affected_business_types": c.affected_business_types,
        "summary": c.summary,
        "confidence": c.confidence,
        "verification_status": c.verification_status,
        "reviewer": c.reviewer,
        "approved_at": c.approved_at,
        "is_synthetic": c.is_synthetic,
    }


@router.post("/analyze")
def analyze(payload: AnalyzeRequest, db: Session = Depends(get_db)):
    changes = change_service.analyze_and_persist(
        db,
        old_sections=payload.old_sections,
        new_sections=payload.new_sections,
        old_source_document_id=payload.old_source_document_id,
        new_source_document_id=payload.new_source_document_id,
        is_synthetic=payload.is_synthetic,
    )
    return [_payload(c) for c in changes]


@router.get("")
def list_changes(db: Session = Depends(get_db)):
    return [_payload(c) for c in db.query(RegulatoryChange).all()]


@router.get("/{change_id}")
def get_change(change_id: str, db: Session = Depends(get_db)):
    c = db.get(RegulatoryChange, change_id)
    if c is None:
        raise HTTPException(404, "Regulatory change not found")
    return _payload(c)
