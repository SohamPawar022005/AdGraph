from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import JSON, Date, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db import Base
from .base import ProvenanceMixin, TimestampMixin, new_id


class Jurisdiction(Base, TimestampMixin):
    __tablename__ = "jurisdictions"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String, unique=True)
    kind: Mapped[str] = mapped_column(String, default="state")  # state | district


class Authority(Base, TimestampMixin):
    __tablename__ = "authorities"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String, unique=True)
    authority_type: Mapped[str] = mapped_column(String, default="department")
    jurisdiction: Mapped[str] = mapped_column(String, default="Maharashtra")
    is_synthetic: Mapped[bool] = mapped_column(default=False)


class SourceDocument(Base, TimestampMixin):
    __tablename__ = "source_documents"
    id: Mapped[str] = mapped_column(String, primary_key=True)  # e.g. "maitri-act-2023"
    title: Mapped[str] = mapped_column(String)
    jurisdiction: Mapped[str] = mapped_column(String, default="Maharashtra")
    authority: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    document_type: Mapped[str] = mapped_column(String, default="Act")
    version_label: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    content_hash: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    retrieved_at: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    source_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    file_type: Mapped[str] = mapped_column(String, default="pdf")
    ocr_status: Mapped[str] = mapped_column(String, default="not_required")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    regulations: Mapped[List["RegulationVersion"]] = relationship(back_populates="source_document")


class Regulation(Base, TimestampMixin):
    __tablename__ = "regulations"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String, unique=True)
    short_code: Mapped[str] = mapped_column(String, unique=True)
    jurisdiction: Mapped[str] = mapped_column(String, default="Maharashtra")

    versions: Mapped[List["RegulationVersion"]] = relationship(back_populates="regulation")


class RegulationVersion(Base, TimestampMixin, ProvenanceMixin):
    __tablename__ = "regulation_versions"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    regulation_id: Mapped[str] = mapped_column(String, ForeignKey("regulations.id"))
    version_label: Mapped[str] = mapped_column(String)
    supersedes_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("regulation_versions.id"), nullable=True
    )
    effective_from: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    effective_to: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    regulation: Mapped["Regulation"] = relationship(back_populates="versions")
    source_document: Mapped[Optional["SourceDocument"]] = relationship(back_populates="regulations")
    sections: Mapped[List["Section"]] = relationship(back_populates="regulation_version")


class Section(Base, TimestampMixin, ProvenanceMixin):
    __tablename__ = "sections"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    regulation_version_id: Mapped[str] = mapped_column(String, ForeignKey("regulation_versions.id"))
    number: Mapped[str] = mapped_column(String)
    heading: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    text: Mapped[str] = mapped_column(Text)

    regulation_version: Mapped["RegulationVersion"] = relationship(back_populates="sections")
    clauses: Mapped[List["Clause"]] = relationship(back_populates="section")

    __table_args__ = (UniqueConstraint("regulation_version_id", "number", name="uq_section_number"),)


class Clause(Base, TimestampMixin, ProvenanceMixin):
    __tablename__ = "clauses"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    section_id: Mapped[str] = mapped_column(String, ForeignKey("sections.id"))
    label: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    text: Mapped[str] = mapped_column(Text)

    section: Mapped["Section"] = relationship(back_populates="clauses")


class Rule(Base, TimestampMixin):
    """A rule identity across versions. The declarative logic lives on RuleVersion."""

    __tablename__ = "rules"
    id: Mapped[str] = mapped_column(String, primary_key=True)  # e.g. "RULE-MAITRI-003"
    name: Mapped[str] = mapped_column(String)
    jurisdiction: Mapped[str] = mapped_column(String, default="Maharashtra")

    versions: Mapped[List["RuleVersion"]] = relationship(back_populates="rule")


class RuleVersion(Base, TimestampMixin, ProvenanceMixin):
    __tablename__ = "rule_versions"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    rule_id: Mapped[str] = mapped_column(String, ForeignKey("rules.id"))
    version: Mapped[str] = mapped_column(String, default="v1")
    supersedes_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("rule_versions.id"), nullable=True
    )
    effective_from: Mapped[date] = mapped_column(Date)
    effective_to: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    rule_body: Mapped[dict] = mapped_column(JSON)  # applies_when / requires / actions (rules-engine schema)

    rule: Mapped["Rule"] = relationship(back_populates="versions")
