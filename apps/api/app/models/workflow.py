from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..db import Base
from .base import TimestampMixin, new_id


class Application(Base, TimestampMixin):
    __tablename__ = "applications"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    business_profile_id: Mapped[str] = mapped_column(String, ForeignKey("business_profiles.id"))
    approval_id: Mapped[str] = mapped_column(String, ForeignKey("approvals.id"))
    state: Mapped[str] = mapped_column(String, default="submitted")
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=True)


class WorkflowEvent(Base, TimestampMixin):
    __tablename__ = "workflow_events"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    application_id: Mapped[str] = mapped_column(String, ForeignKey("applications.id"))
    event_type: Mapped[str] = mapped_column(String)
    from_state: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    to_state: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    actor: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    details: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=True)


class SLA(Base, TimestampMixin):
    __tablename__ = "slas"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    application_id: Mapped[str] = mapped_column(String, ForeignKey("applications.id"), unique=True)
    limit_days: Mapped[int] = mapped_column(Integer)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    escalated: Mapped[bool] = mapped_column(Boolean, default=False)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=True)
    source_note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    application_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("applications.id"), nullable=True)
    message: Mapped[str] = mapped_column(Text)
    level: Mapped[str] = mapped_column(String, default="info")  # info|warning|escalation
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class Inspection(Base, TimestampMixin):
    __tablename__ = "inspections"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    application_id: Mapped[str] = mapped_column(String, ForeignKey("applications.id"))
    scheduled_for: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_joint: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String, default="scheduled")
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=True)


class Document(Base, TimestampMixin):
    __tablename__ = "documents"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    business_profile_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("business_profiles.id"), nullable=True
    )
    application_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("applications.id"), nullable=True)
    document_type: Mapped[str] = mapped_column(String)
    original_filename: Mapped[str] = mapped_column(String)
    storage_key: Mapped[str] = mapped_column(String)
    content_hash: Mapped[str] = mapped_column(String)
    size_bytes: Mapped[int] = mapped_column(Integer)
    extracted_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ocr_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    validation_status: Mapped[str] = mapped_column(String, default="pending")  # pending|valid|invalid
    validation_errors: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=True)
