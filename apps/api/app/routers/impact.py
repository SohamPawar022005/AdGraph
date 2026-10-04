from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..services import impact_service

router = APIRouter(prefix="/api/v1/impact", tags=["impact"])


@router.get("/{change_id}")
def get_impact(change_id: str, db: Session = Depends(get_db)):
    try:
        assessment = impact_service.run_impact_analysis(db, change_id)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    return {
        "id": assessment.id,
        "regulatory_change_id": assessment.regulatory_change_id,
        "directly_affected_approvals": assessment.directly_affected_approvals,
        "downstream_affected_approvals": assessment.downstream_affected_approvals,
        "affected_business_types": assessment.affected_business_types,
        "affected_application_ids": assessment.affected_application_ids,
        "impact_score": assessment.impact_score,
        "methodology": assessment.methodology,
        "explanation": assessment.explanation,
        "disclaimer": assessment.disclaimer,
    }
