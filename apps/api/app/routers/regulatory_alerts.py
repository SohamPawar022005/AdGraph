from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.subscriptions import RegulatoryAlert, RegulatorySource, RegulatorySubscription
from ..services import regulatory_alerts_service

router = APIRouter(prefix="/api/v1/alerts", tags=["regulatory-alerts"])


class CreateSubscriptionRequest(BaseModel):
    subscription_type: str  # act | rule | regulation | approval | authority | business
    target_id: str
    target_label: str
    user_id: Optional[str] = None
    notification_channels: List[str] = ["in_app"]


class ResolveAlertRequest(BaseModel):
    is_false_positive: bool = False
    resolution_notes: Optional[str] = None


class CheckSourcesRequest(BaseModel):
    source_id: Optional[str] = None
    simulated_content: Optional[str] = None


def _source_payload(s: RegulatorySource) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "jurisdiction": s.jurisdiction,
        "authority": s.authority,
        "source_url": s.source_url,
        "source_type": s.source_type,
        "last_checked_at": s.last_checked_at.isoformat() if s.last_checked_at else None,
        "last_check_status": s.last_check_status,
        "last_error": s.last_error,
        "version_fingerprint": s.version_fingerprint,
        "check_interval_hours": s.check_interval_hours,
        "is_active": s.is_active,
        "description": s.description,
    }


def _sub_payload(s: RegulatorySubscription) -> dict:
    return {
        "id": s.id,
        "user_id": s.user_id,
        "subscription_type": s.subscription_type,
        "target_id": s.target_id,
        "target_label": s.target_label,
        "notification_channels": s.notification_channels,
        "is_active": s.is_active,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


def _alert_payload(a: RegulatoryAlert) -> dict:
    return {
        "id": a.id,
        "subscription_id": a.subscription_id,
        "user_id": a.user_id,
        "regulatory_change_id": a.regulatory_change_id,
        "title": a.title,
        "message": a.message,
        "priority": a.priority,
        "is_read": a.is_read,
        "read_at": a.read_at.isoformat() if a.read_at else None,
        "is_dismissed": a.is_dismissed,
        "is_false_positive": a.is_false_positive,
        "resolution_notes": a.resolution_notes,
        "affected_business_id": a.affected_business_id,
        "affected_business_name": a.affected_business_name,
        "affected_application_id": a.affected_application_id,
        "affected_task_id": a.affected_task_id,
        "impact_summary": a.impact_summary,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


@router.get("/sources")
def list_sources(db: Session = Depends(get_db)):
    sources = regulatory_alerts_service.ensure_default_sources(db)
    return [_source_payload(s) for s in sources]


@router.post("/sources/check-now")
def check_sources(payload: CheckSourcesRequest, db: Session = Depends(get_db)):
    regulatory_alerts_service.ensure_default_sources(db)
    if payload.source_id:
        try:
            res = regulatory_alerts_service.check_source_for_updates(
                db, payload.source_id, simulated_content=payload.simulated_content
            )
            return [res]
        except ValueError as exc:
            raise HTTPException(404, str(exc)) from exc
    else:
        results = []
        for src in db.query(RegulatorySource).filter(RegulatorySource.is_active.is_(True)).all():
            res = regulatory_alerts_service.check_source_for_updates(db, src.id)
            results.append(res)
        return results


@router.get("/subscriptions")
def list_subscriptions(user_id: Optional[str] = None, db: Session = Depends(get_db)):
    subs = regulatory_alerts_service.list_subscriptions(db, user_id=user_id)
    return [_sub_payload(s) for s in subs]


@router.post("/subscriptions")
def create_subscription(payload: CreateSubscriptionRequest, db: Session = Depends(get_db)):
    sub = regulatory_alerts_service.create_subscription(
        db,
        subscription_type=payload.subscription_type,
        target_id=payload.target_id,
        target_label=payload.target_label,
        user_id=payload.user_id,
        notification_channels=payload.notification_channels,
    )
    return _sub_payload(sub)


@router.delete("/subscriptions/{subscription_id}")
def delete_subscription(subscription_id: str, db: Session = Depends(get_db)):
    regulatory_alerts_service.delete_subscription(db, subscription_id)
    return {"ok": True}


@router.get("/dashboard-stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Provides consolidated statistics for the Regulatory Change Alerts Dashboard."""
    return regulatory_alerts_service.get_dashboard_analytics(db)


@router.get("")
def list_alerts(
    business_id: Optional[str] = None,
    priority: Optional[str] = None,
    is_read: Optional[bool] = None,
    include_dismissed: bool = False,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    query = db.query(RegulatoryAlert)
    if not include_dismissed:
        query = query.filter(RegulatoryAlert.is_dismissed.is_(False))
    if business_id:
        query = query.filter(RegulatoryAlert.affected_business_id == business_id)
    if priority:
        query = query.filter(RegulatoryAlert.priority == priority)
    if is_read is not None:
        query = query.filter(RegulatoryAlert.is_read.is_(is_read))

    total = query.count()
    items = query.order_by(RegulatoryAlert.created_at.desc()).offset(offset).limit(limit).all()
    return {"total": total, "items": [_alert_payload(a) for a in items]}


@router.patch("/{alert_id}/read")
def mark_alert_read(alert_id: str, db: Session = Depends(get_db)):
    try:
        alert = regulatory_alerts_service.mark_alert_read(db, alert_id)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    return _alert_payload(alert)


@router.post("/{alert_id}/resolve")
def resolve_alert(alert_id: str, payload: ResolveAlertRequest, db: Session = Depends(get_db)):
    try:
        alert = regulatory_alerts_service.resolve_alert(
            db,
            alert_id=alert_id,
            is_false_positive=payload.is_false_positive,
            notes=payload.resolution_notes,
        )
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    return _alert_payload(alert)


@router.post("/trigger-impact/{change_id}")
def trigger_impact_alerts(change_id: str, db: Session = Depends(get_db)):
    try:
        alerts = regulatory_alerts_service.trace_impact_and_notify(db, change_id)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    return {"change_id": change_id, "alerts_dispatched": len(alerts), "items": [_alert_payload(a) for a in alerts]}
