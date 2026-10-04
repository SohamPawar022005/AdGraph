from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.workflow import Application, WorkflowEvent
from ..services import workflow_service

router = APIRouter(prefix="/api/v1/applications", tags=["applications"])


class CreateApplicationRequest(BaseModel):
    business_profile_id: str
    approval_id: str
    limit_days: int = 21


class TransitionRequest(BaseModel):
    target_state: str
    actor: str = "system"


def _payload(a: Application) -> dict:
    return {
        "id": a.id,
        "business_profile_id": a.business_profile_id,
        "approval_id": a.approval_id,
        "state": a.state,
        "is_synthetic": a.is_synthetic,
    }


@router.post("")
def create_application(payload: CreateApplicationRequest, db: Session = Depends(get_db)):
    app = workflow_service.start_application(
        db, payload.business_profile_id, payload.approval_id, limit_days=payload.limit_days
    )
    return _payload(app)


@router.get("")
def list_applications(
    limit: int = 50,
    offset: int = 0,
    business_profile_id: Optional[str] = None,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Application)
    if business_profile_id:
        query = query.filter(Application.business_profile_id == business_profile_id)
    if state:
        query = query.filter(Application.state == state)
    total = query.count()
    items = query.order_by(Application.created_at.desc()).offset(offset).limit(limit).all()
    return {"total": total, "items": [_payload(a) for a in items]}


@router.get("/{application_id}")
def get_application(application_id: str, db: Session = Depends(get_db)):
    app = db.get(Application, application_id)
    if app is None:
        raise HTTPException(404, "Application not found")
    events = (
        db.query(WorkflowEvent)
        .filter(WorkflowEvent.application_id == application_id)
        .order_by(WorkflowEvent.occurred_at)
        .all()
    )
    return {
        **_payload(app),
        "sla": workflow_service.sla_snapshot(db, application_id),
        "events": [
            {
                "event_type": e.event_type,
                "from_state": e.from_state,
                "to_state": e.to_state,
                "occurred_at": e.occurred_at,
                "actor": e.actor,
            }
            for e in events
        ],
    }


@router.post("/{application_id}/transition")
def transition_application(application_id: str, payload: TransitionRequest, db: Session = Depends(get_db)):
    try:
        app = workflow_service.transition(db, application_id, payload.target_state, actor=payload.actor)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    return _payload(app)


@router.get("/{application_id}/sla")
def get_sla(application_id: str, db: Session = Depends(get_db)):
    return workflow_service.sla_snapshot(db, application_id)
