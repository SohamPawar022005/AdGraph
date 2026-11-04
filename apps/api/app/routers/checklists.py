from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.checklist import ChecklistDocument, ChecklistTask, ComplianceChecklist
from ..services import checklist_service

router = APIRouter(prefix="/api/v1/checklists", tags=["checklists"])


class GenerateChecklistRequest(BaseModel):
    business_profile_id: str
    project_name: str = "Primary Facility Project"


class ManualTaskRequest(BaseModel):
    title: str
    description: Optional[str] = None
    authority_name: str = "Internal Compliance"
    category: str = "Custom Requirement"
    due_date: Optional[datetime] = None
    prerequisite_approval_ids: List[str] = []


class UpdateTaskRequest(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    due_date: Optional[datetime] = None
    reminder_days: Optional[int] = None
    actor: str = "user"


class UpdateDocumentRequest(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    file_url: Optional[str] = None
    actor: str = "user"


class ResolveReviewRequest(BaseModel):
    resolution_notes: str
    actor: str = "user"


def _doc_payload(d: ChecklistDocument) -> dict:
    return {
        "id": d.id,
        "checklist_id": d.checklist_id,
        "task_id": d.task_id,
        "document_type": d.document_type,
        "name": d.name,
        "purpose": d.purpose,
        "is_mandatory": d.is_mandatory,
        "status": d.status,
        "source_reference": d.source_reference,
        "verification_status": d.verification_status,
        "document_id": d.document_id,
        "file_url": d.file_url,
        "notes": d.notes,
    }


def _task_payload(t: ChecklistTask) -> dict:
    return {
        "id": t.id,
        "checklist_id": t.checklist_id,
        "approval_id": t.approval_id,
        "application_id": t.application_id,
        "title": t.title,
        "description": t.description,
        "authority_name": t.authority_name,
        "category": t.category,
        "status": t.status,
        "is_manual": t.is_manual,
        "legal_deadline": t.legal_deadline.isoformat() if t.legal_deadline else None,
        "legal_deadline_note": t.legal_deadline_note,
        "due_date": t.due_date.isoformat() if t.due_date else None,
        "reminder_days": t.reminder_days,
        "prerequisite_approval_ids": t.prerequisite_approval_ids or [],
        "blocking_reasons": t.blocking_reasons or [],
        "supporting_rule_id": t.supporting_rule_id,
        "source_reference": t.source_reference,
        "notes": t.notes,
        "completed_at": t.completed_at.isoformat() if t.completed_at else None,
        "completed_by": t.completed_by,
        "flagged_for_review": t.flagged_for_review,
        "flag_reason": t.flag_reason,
        "flag_change_id": t.flag_change_id,
        "documents": [_doc_payload(d) for d in t.documents],
    }


def _checklist_payload(c: ComplianceChecklist) -> dict:
    return {
        "id": c.id,
        "business_profile_id": c.business_profile_id,
        "project_name": c.project_name,
        "status": c.status,
        "readiness_status": c.readiness_status,
        "readiness_summary": c.readiness_summary,
        "last_evaluated_at": c.last_evaluated_at.isoformat() if c.last_evaluated_at else None,
        "notes": c.notes,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "tasks": [_task_payload(t) for t in c.tasks],
        "documents": [_doc_payload(d) for d in c.documents],
    }


@router.post("/generate")
def generate_checklist(payload: GenerateChecklistRequest, db: Session = Depends(get_db)):
    try:
        checklist = checklist_service.generate_checklist_for_business(
            db, payload.business_profile_id, project_name=payload.project_name
        )
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    return _checklist_payload(checklist)


@router.get("")
def list_checklists(
    business_profile_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    query = db.query(ComplianceChecklist)
    if business_profile_id:
        query = query.filter(ComplianceChecklist.business_profile_id == business_profile_id)
    total = query.count()
    items = query.order_by(ComplianceChecklist.updated_at.desc()).offset(offset).limit(limit).all()
    return {"total": total, "items": [_checklist_payload(c) for c in items]}


@router.get("/{checklist_id}")
def get_checklist(checklist_id: str, db: Session = Depends(get_db)):
    c = db.get(ComplianceChecklist, checklist_id)
    if c is None:
        raise HTTPException(404, "ComplianceChecklist not found")
    return _checklist_payload(c)


@router.post("/{checklist_id}/tasks")
def add_task(checklist_id: str, payload: ManualTaskRequest, db: Session = Depends(get_db)):
    try:
        task = checklist_service.add_manual_task(
            db,
            checklist_id=checklist_id,
            title=payload.title,
            description=payload.description,
            authority_name=payload.authority_name,
            category=payload.category,
            due_date=payload.due_date,
            prerequisite_approval_ids=payload.prerequisite_approval_ids,
        )
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    return _task_payload(task)


@router.patch("/tasks/{task_id}")
def update_task(task_id: str, payload: UpdateTaskRequest, db: Session = Depends(get_db)):
    try:
        task = checklist_service.update_task(
            db,
            task_id=task_id,
            status=payload.status,
            notes=payload.notes,
            due_date=payload.due_date,
            reminder_days=payload.reminder_days,
            actor=payload.actor,
        )
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    return _task_payload(task)


@router.patch("/documents/{document_id}")
def update_document(document_id: str, payload: UpdateDocumentRequest, db: Session = Depends(get_db)):
    try:
        doc = checklist_service.update_document(
            db,
            document_id=document_id,
            status=payload.status,
            notes=payload.notes,
            file_url=payload.file_url,
            actor=payload.actor,
        )
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    return _doc_payload(doc)


@router.post("/tasks/{task_id}/resolve-review")
def resolve_review(task_id: str, payload: ResolveReviewRequest, db: Session = Depends(get_db)):
    try:
        task = checklist_service.resolve_task_review_flag(
            db, task_id=task_id, resolution_notes=payload.resolution_notes, actor=payload.actor
        )
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    return _task_payload(task)


@router.get("/{checklist_id}/readiness")
def get_readiness(checklist_id: str, db: Session = Depends(get_db)):
    try:
        report = checklist_service.validate_readiness(db, checklist_id)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    return report
