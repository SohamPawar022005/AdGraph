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
        "evidence_paths": assessment.evidence_paths or [],
        "has_uncertain_coverage": assessment.has_uncertain_coverage,
        "relationship_tiers": assessment.relationship_tiers or {},
    }


@router.get("/{change_id}/export")
def export_impact_json(change_id: str, db: Session = Depends(get_db)):
    """Export complete structured impact analysis and change provenance report as JSON."""
    from ..models.changes import RegulatoryChange
    change = db.get(RegulatoryChange, change_id)
    if change is None:
        raise HTTPException(404, f"RegulatoryChange '{change_id}' not found")
    try:
        assessment = impact_service.run_impact_analysis(db, change_id)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc

    return {
        "report_version": "1.0.0",
        "generated_at": assessment.created_at.isoformat() if assessment.created_at else None,
        "change": {
            "id": change.id,
            "change_type": change.change_type,
            "section_label": change.section_label,
            "summary": change.summary,
            "confidence": change.confidence,
            "verification_status": change.verification_status,
            "is_uncertain": change.is_uncertain,
            "matching_rationale": change.matching_rationale,
            "old_text": change.old_text,
            "new_text": change.new_text,
            "source_references": change.source_references,
            "evidence_tokens": change.evidence_tokens,
            "affected_rule_ids": change.affected_rule_ids,
            "affected_approval_ids": change.affected_approval_ids,
        },
        "impact": {
            "id": assessment.id,
            "impact_score": assessment.impact_score,
            "directly_affected_approvals": assessment.directly_affected_approvals,
            "downstream_affected_approvals": assessment.downstream_affected_approvals,
            "affected_business_types": assessment.affected_business_types,
            "affected_application_ids": assessment.affected_application_ids,
            "evidence_paths": assessment.evidence_paths or [],
            "has_uncertain_coverage": assessment.has_uncertain_coverage,
            "relationship_tiers": assessment.relationship_tiers or {},
            "methodology": assessment.methodology,
            "explanation": assessment.explanation,
            "disclaimer": assessment.disclaimer,
        },
    }

