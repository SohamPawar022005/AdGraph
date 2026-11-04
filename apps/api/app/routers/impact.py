from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.business import BusinessProfile
from ..models.workflow import Application
from ..services import impact_service

router = APIRouter(prefix="/api/v1/impact", tags=["impact"])


class PolicySimulationRequest(BaseModel):
    policy_type: str = "sla_reduction"  # sla_reduction | deemed_approval | penalty_escalation | fee_waiver
    target_timeline_days: int = 15
    target_districts: Optional[List[str]] = None
    target_industries: Optional[List[str]] = None


@router.post("/policy-simulation")
def simulate_policy_impact(payload: PolicySimulationRequest, db: Session = Depends(get_db)):
    """Simulate economic and pipeline impact across all registered industrial applications."""
    policy_type = payload.policy_type

    if policy_type == "sla_reduction":
        target_approvals = ["joint-inspection-scheduling", "consent-to-establish"]
        title = "Statutory Joint Inspection SLA Acceleration (Section 16)"
        citation = "The Maharashtra Industry, Trade and Investment Facilitation Act, 2023 [Section 16] & Notification IAC-2024"
        days_saved_per_unit = max(30 - payload.target_timeline_days, 5)
        backlog_reduction = 38.5
    elif policy_type == "deemed_approval":
        target_approvals = ["consent-to-establish", "midc-plot-allotment", "factory-license"]
        title = "Mandatory 21-Day Deemed Clearance Auto-Generation (Section 4)"
        citation = "The Maharashtra Industry, Trade and Investment Facilitation Act, 2023 [Section 4(3)]"
        days_saved_per_unit = max(45 - payload.target_timeline_days, 10)
        backlog_reduction = 44.0
    elif policy_type == "penalty_escalation":
        target_approvals = ["consent-to-establish", "consent-to-operate", "factory-license"]
        title = "Industrial Pollution & Construction Penalty Escalation (Section 46)"
        citation = "The Maharashtra Industrial Development Act, 1961 [Section 46 as amended 2012]"
        days_saved_per_unit = 0
        backlog_reduction = 12.0
    elif policy_type == "mpcb_green_auto":
        target_approvals = ["consent-to-establish", "consent-to-operate"]
        title = "Green/White Category Instant Auto-Consent Scheme (MPCB 2024 Order)"
        citation = "Water Act 1974 Sec 25 & Air Act 1981 Sec 21 read with MPCB EODB Order No. B-240118-FTS-0120"
        days_saved_per_unit = max(45 - payload.target_timeline_days, 15)
        backlog_reduction = 52.0
    elif policy_type == "fire_noc_delegation":
        target_approvals = ["fire-noc", "fire-safety-audit-form-b"]
        title = "Industrial Sheds Licensed Agency Fire Audit Substitution (Section 5(1A))"
        citation = "The Maharashtra Fire Prevention and Life Safety Measures Act, 2006 [Section 5(1A) as amended 2023]"
        days_saved_per_unit = max(30 - payload.target_timeline_days, 8)
        backlog_reduction = 41.0
    else:  # fee_waiver
        target_approvals = ["single-window-application", "joint-inspection-scheduling"]
        title = "MSME & Women-Led Enterprise 100% Processing Fee Concession (Section 19)"
        citation = "The Maharashtra Industry, Trade and Investment Facilitation Act, 2023 [Section 19 Proviso]"
        days_saved_per_unit = 7
        backlog_reduction = 22.0

    query = (
        db.query(Application, BusinessProfile)
        .join(BusinessProfile, Application.business_profile_id == BusinessProfile.id)
        .filter(Application.approval_id.in_(target_approvals))
        .filter(Application.state.in_(["submitted", "under_review", "inspection_scheduled", "query_raised"]))
    )

    if payload.target_districts:
        query = query.filter(BusinessProfile.district.in_(payload.target_districts))
    if payload.target_industries:
        query = query.filter(BusinessProfile.industry.in_(payload.target_industries))

    records = query.all()
    total_units = len(records)
    total_inv = sum(b.investment or 0 for _, b in records)
    total_inv_cr = round(total_inv / 1e7, 2)
    total_mandays = total_units * days_saved_per_unit

    dist_map = {}
    for _, b in records:
        dist = b.district or "Other"
        if dist not in dist_map:
            dist_map[dist] = {"district": dist, "units": 0, "capital_cr": 0.0}
        dist_map[dist]["units"] += 1
        dist_map[dist]["capital_cr"] += (b.investment or 0) / 1e7

    sorted_districts = sorted(dist_map.values(), key=lambda x: x["units"], reverse=True)[:8]
    for d in sorted_districts:
        d["capital_cr"] = round(d["capital_cr"], 2)

    sample_units = [
        {
            "id": a.id,
            "name": b.name,
            "district": b.district,
            "industry": b.industry.replace("_", " ").title(),
            "investment_cr": round((b.investment or 0) / 1e7, 2),
            "approval_id": a.approval_id,
            "state": a.state,
        }
        for a, b in records[:6]
    ]

    claim_notice = f"""STATUTORY DEEMED APPROVAL CLAIM NOTICE
Under Section 16(3) & Section 4(3) of The Maharashtra Industry, Trade and Investment Facilitation Act, 2023
(Maharashtra Act No. XXXIV of 2023 read with Notification No. IAC-2024/CR-104/IND-7)

To: The Competent Authority / Nodal Agency (MAITRI Council)
Subject: Formal Statutory Demand for Issuance of Deemed Clearance Certificate

1. The applicant industrial undertaking filed an application for statutory approvals under the Single Window System.
2. Under Section 16 of the Act, mandatory joint site inspections for industrial units must be executed within {payload.target_timeline_days} days.
3. The statutory timeline has elapsed without adverse finding or rejection.
4. THEREFORE, by operation of law under Section 16(3) and Section 4(3), the requested clearance stands DEEMED APPROVED WITH ZERO NON-COMPLIANCES.

Generated via PermitGraph Compliance Intelligence Engine"""

    return {
        "policy_type": policy_type,
        "title": title,
        "statutory_citation": citation,
        "total_units_impacted": total_units,
        "capital_accelerated_crores": total_inv_cr,
        "average_days_saved_per_unit": days_saved_per_unit,
        "total_mandays_saved": total_mandays,
        "backlog_reduction_percent": backlog_reduction,
        "district_distribution": sorted_districts,
        "sample_affected_units": sample_units,
        "statutory_claim_template": claim_notice,
    }


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
