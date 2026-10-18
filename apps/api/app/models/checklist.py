from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base
from .base import TimestampMixin, new_id, utcnow


class ComplianceChecklist(Base, TimestampMixin):
    __tablename__ = "compliance_checklists"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    business_profile_id: Mapped[str] = mapped_column(String, ForeignKey("business_profiles.id"))
    project_name: Mapped[str] = mapped_column(String, default="Primary Facility Project")
    status: Mapped[str] = mapped_column(String, default="in_progress")  # in_progress | completed | needs_review
    readiness_status: Mapped[str] = mapped_column(
        String, default="action_required"
    )  # ready_for_review | action_required | needs_verification
    readiness_summary: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    last_evaluated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    tasks: Mapped[List["ChecklistTask"]] = relationship(
        "ChecklistTask", back_populates="checklist", cascade="all, delete-orphan"
    )
    documents: Mapped[List["ChecklistDocument"]] = relationship(
        "ChecklistDocument", back_populates="checklist", cascade="all, delete-orphan"
    )


class ChecklistTask(Base, TimestampMixin):
    __tablename__ = "checklist_tasks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    checklist_id: Mapped[str] = mapped_column(String, ForeignKey("compliance_checklists.id"))
    approval_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("approvals.id"), nullable=True)
    application_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("applications.id"), nullable=True)

    title: Mapped[str] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    authority_name: Mapped[str] = mapped_column(String, default="Competent Authority")
    category: Mapped[str] = mapped_column(String, default="Pre-Establishment")
    
    # Status: not_started | in_progress | blocked | completed | needs_review
    status: Mapped[str] = mapped_column(String, default="not_started")
    is_manual: Mapped[bool] = mapped_column(Boolean, default=False)

    # Deadlines: distinguishing legal statutory deadlines from user planned target dates
    legal_deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    legal_deadline_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reminder_days: Mapped[int] = mapped_column(Integer, default=7)
    last_reminded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Graph dependencies
    prerequisite_approval_ids: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    blocking_reasons: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)

    # Provenance and source citations
    supporting_rule_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    source_reference: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_by: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Regulatory change flags
    flagged_for_review: Mapped[bool] = mapped_column(Boolean, default=False)
    flag_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    flag_change_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    checklist: Mapped["ComplianceChecklist"] = relationship("ComplianceChecklist", back_populates="tasks")
    documents: Mapped[List["ChecklistDocument"]] = relationship(
        "ChecklistDocument", back_populates="task", cascade="all, delete-orphan"
    )


class ChecklistDocument(Base, TimestampMixin):
    __tablename__ = "checklist_documents"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    checklist_id: Mapped[str] = mapped_column(String, ForeignKey("compliance_checklists.id"))
    task_id: Mapped[str] = mapped_column(String, ForeignKey("checklist_tasks.id"))
    document_type: Mapped[str] = mapped_column(String)
    name: Mapped[str] = mapped_column(String)
    purpose: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=True)

    # Status: missing | collected | uploaded | verified | unknown
    status: Mapped[str] = mapped_column(String, default="missing")
    source_reference: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    verification_status: Mapped[str] = mapped_column(String, default="verified")  # verified | needs_verification

    document_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("documents.id"), nullable=True)
    file_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    checklist: Mapped["ComplianceChecklist"] = relationship("ComplianceChecklist", back_populates="documents")
    task: Mapped["ChecklistTask"] = relationship("ChecklistTask", back_populates="documents")
