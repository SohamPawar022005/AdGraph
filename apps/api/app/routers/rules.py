from datetime import date
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.regulatory import Rule, RuleVersion
from ..services import rules_service

router = APIRouter(prefix="/api/v1/rules", tags=["rules"])


@router.get("")
def list_rules(db: Session = Depends(get_db)):
    rules = db.query(Rule).all()
    out = []
    for r in rules:
        latest = sorted(r.versions, key=lambda v: v.created_at)[-1] if r.versions else None
        out.append(
            {
                "id": r.id,
                "name": r.name,
                "jurisdiction": r.jurisdiction,
                "latest_version": latest.version if latest else None,
                "status": latest.status if latest else None,
                "verification_status": latest.verification_status if latest else None,
                "source_document_id": latest.source_document_id if latest else None,
                "source_section": latest.source_section if latest else None,
                "version_count": len(r.versions),
            }
        )
    return out


@router.get("/{rule_id}")
def get_rule(rule_id: str, db: Session = Depends(get_db)):
    rule = db.get(Rule, rule_id)
    if rule is None:
        raise HTTPException(404, "Rule not found")
    versions = sorted(rule.versions, key=lambda v: v.created_at)
    return {
        "id": rule.id,
        "name": rule.name,
        "jurisdiction": rule.jurisdiction,
        "versions": [
            {
                "id": v.id,
                "version": v.version,
                "supersedes_id": v.supersedes_id,
                "effective_from": v.effective_from,
                "effective_to": v.effective_to,
                "status": v.status,
                "verification_status": v.verification_status,
                "verified_by": v.verified_by,
                "verified_at": v.verified_at,
                "confidence": v.confidence,
                "source_document_id": v.source_document_id,
                "source_section": v.source_section,
                "source_url": v.source_url,
                "notes": v.notes,
                "rule_body": v.rule_body,
            }
            for v in versions
        ],
    }


class EvaluateRequest(BaseModel):
    business_profile: Dict[str, Any]
    as_of: Optional[date] = None


@router.post("/evaluate")
def evaluate_rules(payload: EvaluateRequest, db: Session = Depends(get_db)):
    return rules_service.discover(db, payload.business_profile, as_of=payload.as_of)
