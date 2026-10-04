from __future__ import annotations

from typing import Optional

from sqlalchemy import JSON, Boolean, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from ..db import Base
from .base import TimestampMixin, new_id


class BusinessProfile(Base, TimestampMixin):
    __tablename__ = "business_profiles"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String)
    industry: Mapped[str] = mapped_column(String)
    district: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    jurisdiction: Mapped[str] = mapped_column(String, default="Maharashtra")
    investment: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    employees: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    project_stage: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    land_type: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    hazardous_material: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    is_village_industry: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    environmental_attributes: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, default=True)
    extra_attributes: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    def to_profile_dict(self) -> dict:
        return {
            "business_id": self.id,
            "industry": self.industry,
            "district": self.district,
            "location": self.location,
            "jurisdiction": self.jurisdiction,
            "investment": self.investment,
            "employees": self.employees,
            "project_stage": self.project_stage,
            "land_type": self.land_type,
            "hazardous_material": self.hazardous_material,
            "is_village_industry": self.is_village_industry,
            "environmental_attributes": self.environmental_attributes or [],
            **(self.extra_attributes or {}),
        }
