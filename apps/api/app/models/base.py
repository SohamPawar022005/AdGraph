from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..db import Base


def new_id() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )


class ProvenanceMixin:
    """Mirrors docs/architecture/data-model.md's provenance mixin.

    Every regulatory-fact table mixes this in. `verification_status` defaults to
    CANDIDATE and is ONLY ever changed by
    app.services.verification_service.review_entity -- see
    docs/architecture/human-verification.md.
    """

    source_document_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("source_documents.id"), nullable=True
    )
    source_section: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    source_page: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    source_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    extraction_method: Mapped[str] = mapped_column(String, default="manual")
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String, default="candidate")
    verification_status: Mapped[str] = mapped_column(String, default="CANDIDATE")
    verified_by: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
