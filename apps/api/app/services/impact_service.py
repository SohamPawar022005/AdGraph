from __future__ import annotations

from datetime import datetime, timezone

from impact_analysis import analyze_impact
from sqlalchemy.orm import Session

from ..models.audit import AuditEvent
from ..models.changes import ImpactAssessment, RegulatoryChange
from ..models.workflow import Application
from . import graph_service


def run_impact_analysis(db: Session, change_id: str) -> ImpactAssessment:
    change = db.get(RegulatoryChange, change_id)
    if change is None:
        raise ValueError(f"RegulatoryChange '{change_id}' not found")

    graph = graph_service.build_graph(db)
    rule_to_approvals = graph_service.rule_to_approvals_map(db)
    approval_to_industries = graph_service.approval_to_industries_map(db)

    active_applications = [
        {"id": app.id, "approval_ids": [app.approval_id]}
        for app in db.query(Application).filter(Application.state.notin_(["approved", "rejected", "withdrawn"])).all()
    ]

    report = analyze_impact(
        changed_rule_ids=change.affected_rule_ids or [],
        rule_to_approvals=rule_to_approvals,
        approval_graph=graph,
        approval_to_business_types=approval_to_industries,
        active_applications=active_applications,
    )

    assessment = ImpactAssessment(
        regulatory_change_id=change_id,
        directly_affected_approvals=report.directly_affected_approvals,
        downstream_affected_approvals=report.downstream_affected_approvals,
        affected_business_types=report.affected_business_types,
        affected_application_ids=report.affected_application_ids,
        impact_score=report.impact_score,
        methodology=report.methodology,
        explanation=report.explanation,
        disclaimer=report.disclaimer,
    )
    db.add(assessment)
    db.add(
        AuditEvent(
            event_type="IMPACT_ANALYSIS_CREATED",
            entity_type="regulatory_change",
            entity_id=change_id,
            actor="system:impact-analysis",
            new_value={"impact_score": report.impact_score},
        )
    )
    db.commit()
    db.refresh(assessment)
    return assessment
