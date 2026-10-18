from __future__ import annotations

import hashlib
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from ..models.approvals import Approval
from ..models.audit import AuditEvent
from ..models.business import BusinessProfile
from ..models.changes import RegulatoryChange
from ..models.checklist import ChecklistTask, ComplianceChecklist
from ..models.regulatory import Authority, Regulation, Rule, SourceDocument
from ..models.subscriptions import RegulatoryAlert, RegulatorySource, RegulatorySubscription
from ..models.workflow import Application
from . import checklist_service, graph_service, impact_service


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


DEFAULT_REGULATORY_SOURCES = [
    {
        "id": "source-maitri",
        "name": "MAITRI Single Window Portal & Gazette",
        "jurisdiction": "Maharashtra",
        "authority": "Industry, Energy and Labour Department",
        "source_url": "https://maitri.mahaonline.gov.in",
        "source_type": "official_gazette",
        "description": "Maharashtra Single Window Clearance Act & Rules Official Portal",
    },
    {
        "id": "source-mpcb",
        "name": "Maharashtra Pollution Control Board (MPCB) Notifications",
        "jurisdiction": "Maharashtra",
        "authority": "Maharashtra Pollution Control Board",
        "source_url": "https://mpcb.gov.in/notifications",
        "source_type": "regulator_portal",
        "description": "Consents under Water Act, Air Act, and EIA notifications",
    },
    {
        "id": "source-cpcb",
        "name": "Central Pollution Control Board (CPCB) Guidelines",
        "jurisdiction": "Central",
        "authority": "Central Pollution Control Board",
        "source_url": "https://cpcb.nic.in/gazette-notifications",
        "source_type": "official_gazette",
        "description": "National environmental guidelines, emission norms and categorisation",
    },
    {
        "id": "source-midc",
        "name": "Maharashtra Industrial Development Corporation (MIDC) Regulations",
        "jurisdiction": "Maharashtra",
        "authority": "MIDC Planning Authority",
        "source_url": "https://midcindia.org/regulations",
        "source_type": "regulator_portal",
        "description": "Industrial plot allotment, building regulations, and local infrastructure consents",
    },
]


def ensure_default_sources(db: Session) -> List[RegulatorySource]:
    """Ensures trusted regulatory sources registry is populated."""
    sources = []
    for data in DEFAULT_REGULATORY_SOURCES:
        src = db.get(RegulatorySource, data["id"])
        if not src:
            src = RegulatorySource(
                id=data["id"],
                name=data["name"],
                jurisdiction=data["jurisdiction"],
                authority=data["authority"],
                source_url=data["source_url"],
                source_type=data["source_type"],
                description=data["description"],
                last_checked_at=utcnow(),
                last_check_status="success",
                version_fingerprint=hashlib.sha256(data["name"].encode()).hexdigest()[:16],
            )
            db.add(src)
        sources.append(src)
    db.commit()
    return sources


def check_source_for_updates(
    db: Session, source_id: str, simulated_content: Optional[str] = None
) -> Dict[str, Any]:
    """Simulates or performs a source check with change fingerprinting."""
    source = db.get(RegulatorySource, source_id)
    if source is None:
        raise ValueError(f"RegulatorySource '{source_id}' not found")

    content_to_check = simulated_content or f"{source.name} - Version as of {utcnow().date().isoformat()}"
    new_fingerprint = hashlib.sha256(content_to_check.encode()).hexdigest()[:16]

    has_changed = (
        source.version_fingerprint is not None
        and source.version_fingerprint != new_fingerprint
        and simulated_content is not None
    )

    source.last_checked_at = utcnow()
    source.last_check_status = "success"
    source.version_fingerprint = new_fingerprint
    db.commit()

    return {
        "source_id": source.id,
        "source_name": source.name,
        "checked_at": source.last_checked_at.isoformat(),
        "status": "success",
        "fingerprint": new_fingerprint,
        "change_detected": has_changed,
    }


def create_subscription(
    db: Session,
    subscription_type: str,
    target_id: str,
    target_label: str,
    user_id: Optional[str] = None,
    notification_channels: Optional[List[str]] = None,
) -> RegulatorySubscription:
    """Create a persistent user or business subscription."""
    existing = (
        db.query(RegulatorySubscription)
        .filter(
            RegulatorySubscription.subscription_type == subscription_type,
            RegulatorySubscription.target_id == target_id,
            RegulatorySubscription.user_id == user_id,
        )
        .first()
    )
    if existing:
        existing.is_active = True
        if notification_channels:
            existing.notification_channels = notification_channels
        db.commit()
        return existing

    sub = RegulatorySubscription(
        user_id=user_id,
        subscription_type=subscription_type,
        target_id=target_id,
        target_label=target_label,
        notification_channels=notification_channels or ["in_app"],
        is_active=True,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


def list_subscriptions(db: Session, user_id: Optional[str] = None) -> List[RegulatorySubscription]:
    query = db.query(RegulatorySubscription).filter(RegulatorySubscription.is_active.is_(True))
    if user_id:
        query = query.filter(RegulatorySubscription.user_id == user_id)
    return query.all()


def delete_subscription(db: Session, subscription_id: str) -> None:
    sub = db.get(RegulatorySubscription, subscription_id)
    if sub:
        sub.is_active = False
        db.commit()


def trace_impact_and_notify(db: Session, change_id: str) -> List[RegulatoryAlert]:
    """Core impact analysis engine tracing relationships from regulatory changes

    to businesses, applications, and compliance checklist tasks:
    Acts/Rules -> Permit Requirements -> Approvals -> Business Activities -> Businesses -> Applications -> Tasks!
    """
    change = db.get(RegulatoryChange, change_id)
    if change is None:
        raise ValueError(f"RegulatoryChange '{change_id}' not found")

    # Run structural impact analysis
    assessment = impact_service.run_impact_analysis(db, change_id)

    directly_affected_approvals = set(assessment.directly_affected_approvals or [])
    downstream_affected_approvals = set(assessment.downstream_affected_approvals or [])
    all_affected_approvals = directly_affected_approvals | downstream_affected_approvals
    affected_business_types = set(assessment.affected_business_types or [])

    # Fetch active subscriptions
    subscriptions = db.query(RegulatorySubscription).filter(RegulatorySubscription.is_active.is_(True)).all()

    alerts_created: List[RegulatoryAlert] = []

    # Find matching businesses
    matching_businesses = (
        db.query(BusinessProfile)
        .filter(BusinessProfile.industry.in_(affected_business_types))
        .all()
    )

    # Determine alert priority based on change type and graph depth
    priority = "medium"
    if "deadline" in change.change_type.lower() or assessment.impact_score > 0.6:
        priority = "urgent"
    elif "text" in change.change_type.lower() and assessment.impact_score < 0.3:
        priority = "informational"


    # For each matching business, find affected applications and checklist tasks
    for biz in matching_businesses:
        # Check active applications
        biz_apps = (
            db.query(Application)
            .filter(
                Application.business_profile_id == biz.id,
                Application.approval_id.in_(all_affected_approvals),
                Application.state.notin_(["approved", "rejected", "withdrawn"]),
            )
            .all()
        )

        # Check compliance checklist tasks
        biz_checklists = (
            db.query(ComplianceChecklist)
            .filter(ComplianceChecklist.business_profile_id == biz.id)
            .all()
        )

        for checklist in biz_checklists:
            for task in checklist.tasks:
                if task.approval_id in all_affected_approvals:
                    # Flag checklist task for review!
                    task.flagged_for_review = True
                    task.flag_reason = f"Regulatory update: {change.summary or change.change_type}"
                    task.flag_change_id = change.id
                    if task.status != "completed":
                        task.status = "needs_review"

                    # Generate personalized alert
                    alert_title = f"Regulatory Update: {change.section_label or 'Compliance requirement'} amended"
                    impact_desc = (
                        f"Approval '{task.approval_id}' in your checklist is "
                        f"{'directly' if task.approval_id in directly_affected_approvals else 'downstream'} "
                        f"affected by changes in {change.section_label or 'applicable regulations'}."
                    )
                    recommended_action = (
                        f"Review checklist task '{task.title}' and verify application filings against the new requirements."
                    )

                    impact_summary = {
                        "regulation_title": change.section_label or "Environmental & Single Window Regulation",
                        "change_summary": change.summary or "Clause modified in official publication",
                        "affected_business": biz.name,
                        "affected_application": biz_apps[0].id if biz_apps else "Checklist item",
                        "potential_impact": impact_desc,
                        "recommended_action": recommended_action,
                        "effective_date": utcnow().date().isoformat(),
                        "confidence": change.confidence,
                        "official_source": change.source_references.get("url") if change.source_references else None,
                        "is_direct": task.approval_id in directly_affected_approvals,
                    }

                    alert = RegulatoryAlert(
                        regulatory_change_id=change.id,
                        title=alert_title,
                        message=f"{impact_desc} {recommended_action}",
                        priority=priority,
                        affected_business_id=biz.id,
                        affected_business_name=biz.name,
                        affected_application_id=biz_apps[0].id if biz_apps else None,
                        affected_task_id=task.id,
                        impact_summary=impact_summary,
                    )
                    db.add(alert)
                    alerts_created.append(alert)

            # Re-evaluate checklist readiness
            checklist_service.validate_readiness(db, checklist.id)

    # General alerts for subscribers subscribed to the changed rule, approval, or authority
    for sub in subscriptions:
        match = False
        if sub.subscription_type == "rule" and sub.target_id in (change.affected_rule_ids or []):
            match = True
        elif sub.subscription_type == "approval" and sub.target_id in all_affected_approvals:
            match = True

        if match:
            # Check if alert already created for this user/subscription
            existing_alert = any(
                a.subscription_id == sub.id and a.regulatory_change_id == change.id for a in alerts_created
            )
            if not existing_alert:
                sub_alert = RegulatoryAlert(
                    subscription_id=sub.id,
                    user_id=sub.user_id,
                    regulatory_change_id=change.id,
                    title=f"Subscribed Update: {sub.target_label}",
                    message=f"Change detected for {sub.target_label}: {change.summary or change.change_type}",
                    priority=priority,
                    impact_summary={
                        "regulation_title": sub.target_label,
                        "change_summary": change.summary,
                        "potential_impact": f"Matches your active subscription for {sub.target_label}",
                        "recommended_action": "Review updated provisions in regulatory catalog",
                        "confidence": change.confidence,
                    },
                )
                db.add(sub_alert)
                alerts_created.append(sub_alert)

    db.add(
        AuditEvent(
            event_type="REGULATORY_ALERTS_DISPATCHED",
            entity_type="regulatory_change",
            entity_id=change_id,
            actor="system:regulatory-alerts",
            new_value={"alerts_count": len(alerts_created)},
        )
    )
    db.commit()
    return alerts_created


def mark_alert_read(db: Session, alert_id: str) -> RegulatoryAlert:
    alert = db.get(RegulatoryAlert, alert_id)
    if alert is None:
        raise ValueError(f"RegulatoryAlert '{alert_id}' not found")
    alert.is_read = True
    alert.read_at = utcnow()
    db.commit()
    db.refresh(alert)
    return alert


def resolve_alert(
    db: Session, alert_id: str, is_false_positive: bool = False, notes: Optional[str] = None
) -> RegulatoryAlert:
    alert = db.get(RegulatoryAlert, alert_id)
    if alert is None:
        raise ValueError(f"RegulatoryAlert '{alert_id}' not found")

    alert.is_dismissed = True
    alert.is_false_positive = is_false_positive
    alert.resolution_notes = notes

    # If linked to a checklist task and marked as false positive, unflag the task!
    if is_false_positive and alert.affected_task_id:
        checklist_service.resolve_task_review_flag(
            db,
            alert.affected_task_id,
            resolution_notes=f"Resolved via Alert: {notes or 'False positive impact'}",
        )

    db.commit()
    db.refresh(alert)
    return alert
