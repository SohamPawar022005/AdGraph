from __future__ import annotations

from typing import Optional

from sqlalchemy import JSON, Boolean, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..db import Base
from .base import ProvenanceMixin, TimestampMixin, new_id


class Approval(Base, TimestampMixin, ProvenanceMixin):
    __tablename__ = "approvals"
    id: Mapped[str] = mapped_column(String, primary_key=True)  # slug, e.g. "single-window-application"
    name: Mapped[str] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    authority_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("authorities.id"), nullable=True)
    category: Mapped[str] = mapped_column(String, default="process")  # process | license | consent | registration
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)
    applicable_industries: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)


class ApprovalRequirement(Base, TimestampMixin, ProvenanceMixin):
    __tablename__ = "approval_requirements"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    approval_id: Mapped[str] = mapped_column(String, ForeignKey("approvals.id"))
    document_type: Mapped[str] = mapped_column(String)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, default=True)


class ApprovalDependency(Base, TimestampMixin, ProvenanceMixin):
    __tablename__ = "approval_dependencies"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    approval_id: Mapped[str] = mapped_column(String, ForeignKey("approvals.id"))
    depends_on_approval_id: Mapped[str] = mapped_column(String, ForeignKey("approvals.id"))
    dependency_type: Mapped[str] = mapped_column(String, default="depends_on")  # requires|depends_on|produces|informs
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=False)
    dependency_confidence: Mapped[float] = mapped_column(Float, default=1.0)


class DocumentRequirement(Base, TimestampMixin):
    __tablename__ = "document_types"
    id: Mapped[str] = mapped_column(String, primary_key=True)  # slug
    name: Mapped[str] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class Scheme(Base, TimestampMixin, ProvenanceMixin):
    __tablename__ = "schemes"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=True)
