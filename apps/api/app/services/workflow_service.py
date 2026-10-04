from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from shared.enums import SLAState, WorkflowState
from sqlalchemy.orm import Session
from workflow_engine import SLAClock, SLAConfig, apply_transition
from workflow_engine.workflow import InvalidTransitionError

from ..models.audit import AuditEvent
from ..models.workflow import SLA, Application, Notification, WorkflowEvent


def start_application(
    db: Session, business_profile_id: str, approval_id: str, limit_days: int = 21, is_synthetic: bool = True
) -> Application:
    app = Application(
        business_profile_id=business_profile_id,
        approval_id=approval_id,
        state=WorkflowState.SUBMITTED.value,
        is_synthetic=is_synthetic,
    )
    db.add(app)
    db.flush()

    now = datetime.now(timezone.utc)
    sla = SLA(
        application_id=app.id,
        limit_days=limit_days,
        started_at=now,
        is_synthetic=is_synthetic,
        source_note=SLAConfig(limit_days=limit_days).source_note,
    )
    db.add(sla)
    db.add(
        WorkflowEvent(
            application_id=app.id,
            event_type="APPLICATION_SUBMITTED",
            from_state=None,
            to_state=WorkflowState.SUBMITTED.value,
            occurred_at=now,
            actor="system",
        )
    )
    db.add(
        AuditEvent(
            event_type="APPLICATION_SUBMITTED",
            entity_type="application",
            entity_id=app.id,
            actor="system",
            new_value={"state": WorkflowState.SUBMITTED.value},
        )
    )
    db.add(AuditEvent(event_type="SLA_STARTED", entity_type="application", entity_id=app.id, actor="system"))
    db.commit()
    db.refresh(app)
    return app


def transition(db: Session, application_id: str, target_state: str, actor: str = "system") -> Application:
    app = db.get(Application, application_id)
    if app is None:
        raise ValueError(f"Application '{application_id}' not found")

    current = WorkflowState(app.state)
    target = WorkflowState(target_state)
    try:
        result = apply_transition(current, target)
    except InvalidTransitionError as exc:
        raise ValueError(str(exc)) from exc

    app.state = result.new_state.value
    db.add(
        WorkflowEvent(
            application_id=app.id,
            event_type="WORKFLOW_EVENT",
            from_state=result.previous_state.value,
            to_state=result.new_state.value,
            occurred_at=result.occurred_at,
            actor=actor,
        )
    )
    db.add(
        AuditEvent(
            event_type="WORKFLOW_EVENT",
            entity_type="application",
            entity_id=app.id,
            actor=actor,
            old_value={"state": result.previous_state.value},
            new_value={"state": result.new_state.value},
        )
    )

    if target == WorkflowState.ESCALATED:
        sla = db.query(SLA).filter(SLA.application_id == app.id).first()
        if sla:
            sla.escalated = True
            db.add(
                Notification(
                    application_id=app.id,
                    message=f"Application {app.id} escalated per Section 5 of the MAITRI Act, 2023.",
                    level="escalation",
                    sent_at=datetime.now(timezone.utc),
                )
            )
            db.add(AuditEvent(event_type="SLA_ESCALATED", entity_type="application", entity_id=app.id, actor=actor))

    if target in (WorkflowState.APPROVED, WorkflowState.REJECTED, WorkflowState.WITHDRAWN):
        sla = db.query(SLA).filter(SLA.application_id == app.id).first()
        if sla:
            sla.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(app)
    return app


def _as_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """SQLite drops tzinfo on round-trip; re-attach UTC since everything in this
    service is written with datetime.now(timezone.utc)."""
    if dt is None:
        return None
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def sla_snapshot(db: Session, application_id: str, as_of: Optional[datetime] = None) -> dict:
    sla = db.query(SLA).filter(SLA.application_id == application_id).first()
    if sla is None:
        return {"state": SLAState.NOT_STARTED.value}

    clock = SLAClock(SLAConfig(limit_days=sla.limit_days, is_synthetic=sla.is_synthetic, source_note=sla.source_note or ""))
    clock.started_at = _as_utc(sla.started_at)
    clock.completed_at = _as_utc(sla.completed_at)
    clock.escalated = sla.escalated
    snap = clock.snapshot(as_of=_as_utc(as_of) or datetime.now(timezone.utc))

    if snap.state == SLAState.OVERDUE and not sla.escalated:
        db.add(
            AuditEvent(
                event_type="SLA_BREACHED",
                entity_type="application",
                entity_id=application_id,
                actor="system:sla-monitor",
            )
        )
        db.commit()

    return {
        "state": snap.state.value,
        "started_at": snap.started_at.isoformat() if snap.started_at else None,
        "deadline": snap.deadline.isoformat() if snap.deadline else None,
        "elapsed_days": snap.elapsed_days,
        "remaining_days": snap.remaining_days,
        "is_breached": snap.is_breached,
        "limit_days": sla.limit_days,
        "is_synthetic": sla.is_synthetic,
        "source_note": sla.source_note,
    }
