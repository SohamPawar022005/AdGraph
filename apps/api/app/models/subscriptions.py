from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from ..db import Base
from .base import TimestampMixin, new_id, utcnow


class RegulatorySource(Base, TimestampMixin):
    __tablename__ = "regulatory_sources"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # e.g. "source-maitri"
    name: Mapped[str] = mapped_column(String)
    jurisdiction: Mapped[str] = mapped_column(String, default="Maharashtra")
    authority: Mapped[str] = mapped_column(String)
    source_url: Mapped[str] = mapped_column(String)
    source_type: Mapped[str] = mapped_column(String, default="official_gazette")  # official_gazette | portal_feed | regulator_portal
    
    last_checked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    last_check_status: Mapped[str] = mapped_column(String, default="pending")  # success | failed | pending
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    version_fingerprint: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    check_interval_hours: Mapped[int] = mapped_column(Integer, default=24)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class RegulatorySubscription(Base, TimestampMixin):
    __tablename__ = "regulatory_subscriptions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    user_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # email or user ID
    subscription_type: Mapped[str] = mapped_column(
        String
    )  # act | rule | regulation | approval | authority | business
    target_id: Mapped[str] = mapped_column(String)  # ID or code of targeted entity
    target_label: Mapped[str] = mapped_column(String)
    notification_channels: Mapped[Optional[list]] = mapped_column(JSON, default=lambda: ["in_app"])
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class RegulatoryAlert(Base, TimestampMixin):
    __tablename__ = "regulatory_alerts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    subscription_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("regulatory_subscriptions.id"), nullable=True
    )
    user_id: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    regulatory_change_id: Mapped[str] = mapped_column(String, ForeignKey("regulatory_changes.id"))
    
    title: Mapped[str] = mapped_column(String)
    message: Mapped[str] = mapped_column(Text)
    priority: Mapped[str] = mapped_column(String, default="medium")  # urgent | medium | informational
    
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_dismissed: Mapped[bool] = mapped_column(Boolean, default=False)
    is_false_positive: Mapped[bool] = mapped_column(Boolean, default=False)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Scoped relationships
    affected_business_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("business_profiles.id"), nullable=True
    )
    affected_business_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    affected_application_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("applications.id"), nullable=True
    )
    affected_task_id: Mapped[Optional[str]] = mapped_column(
        String, ForeignKey("checklist_tasks.id"), nullable=True
    )

    # Structured impact details
    impact_summary: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
