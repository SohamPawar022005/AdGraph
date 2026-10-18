from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..db import Base
from .base import TimestampMixin, new_id


class RegulatoryChange(Base, TimestampMixin):
    __tablename__ = "regulatory_changes"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    old_source_document_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("source_documents.id"), nullable=True
    )
    new_source_document_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("source_documents.id"), nullable=True
    )
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    change_type: Mapped[str] = mapped_column(String)
    section_label: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    old_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    new_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    affected_rule_ids: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    affected_approval_ids: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    affected_business_types: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.5)
    verification_status: Mapped[str] = mapped_column(String, default="CANDIDATE")
    reviewer: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)
    source_references: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    matching_rationale: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_uncertain: Mapped[bool] = mapped_column(Boolean, default=False)
    evidence_tokens: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)


class ImpactAssessment(Base, TimestampMixin):
    __tablename__ = "impact_assessments"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    regulatory_change_id: Mapped[str] = mapped_column(String, ForeignKey("regulatory_changes.id"))
    directly_affected_approvals: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    downstream_affected_approvals: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    affected_business_types: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    affected_application_ids: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    impact_score: Mapped[float] = mapped_column(Float, default=0.0)
    methodology: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    disclaimer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    evidence_paths: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    has_uncertain_coverage: Mapped[bool] = mapped_column(Boolean, default=False)
    relationship_tiers: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

