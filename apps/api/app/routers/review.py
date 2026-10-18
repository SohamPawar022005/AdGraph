from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..core.deps import CurrentUser, require_roles
from ..db import get_db
from ..services import verification_service

router = APIRouter(prefix="/api/v1/review", tags=["human-verification"])


class ReviewRequest(BaseModel):
    action: str  # approve | reject | edit | flag | deprecate | supersede
    reason: Optional[str] = None
    updates: Optional[dict] = None


@router.get("/queue/{entity_type}")
def review_queue(entity_type: str, db: Session = Depends(get_db)):
    try:
        items = verification_service.list_pending_review(db, entity_type)
    except KeyError:
        raise HTTPException(400, f"Unknown entity_type '{entity_type}'")
    return [
        {
            "id": getattr(i, "id"),
            "verification_status": getattr(i, "verification_status", None),
            "source_document_id": getattr(i, "source_document_id", None),
            "source_section": getattr(i, "source_section", None),
            "confidence": getattr(i, "confidence", None),
            "notes": getattr(i, "notes", None),
            "summary": getattr(i, "summary", None),
            "change_type": getattr(i, "change_type", None),
            "old_text": getattr(i, "old_text", None),
            "new_text": getattr(i, "new_text", None),
            "rule_body": getattr(i, "rule_body", None),
            "name": getattr(i, "name", None),
        }
        for i in items
    ]


@router.post("/{entity_type}/{entity_id}")
def review_action(
    entity_type: str,
    entity_id: str,
    payload: ReviewRequest,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(require_roles("REGULATORY_REVIEWER")),
):
    try:
        result = verification_service.review_entity(
            db,
            entity_type=entity_type,
            entity_id=entity_id,
            action=payload.action,
            reviewer=user.email,
            reviewer_role=user.role,
            reason=payload.reason,
            updates=payload.updates,
        )
    except verification_service.VerificationError as exc:
        raise HTTPException(400, str(exc)) from exc
    return result

