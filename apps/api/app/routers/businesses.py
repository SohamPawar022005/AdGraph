from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.audit import AuditEvent
from ..models.business import BusinessProfile

router = APIRouter(prefix="/api/v1/businesses", tags=["businesses"])


class CreateBusinessRequest(BaseModel):
    name: str
    industry: str
    district: Optional[str] = None
    location: Optional[str] = None
    jurisdiction: str = "Maharashtra"
    investment: Optional[float] = None
    employees: Optional[int] = None
    project_stage: Optional[str] = None
    land_type: Optional[str] = None
    hazardous_material: Optional[bool] = None
    is_village_industry: Optional[bool] = None
    environmental_attributes: List[str] = []
    is_synthetic: bool = True
    extra_attributes: Dict[str, Any] = {}


def _payload(b: BusinessProfile) -> dict:
    return {
        "id": b.id,
        "name": b.name,
        "industry": b.industry,
        "district": b.district,
        "location": b.location,
        "jurisdiction": b.jurisdiction,
        "investment": b.investment,
        "employees": b.employees,
        "project_stage": b.project_stage,
        "land_type": b.land_type,
        "hazardous_material": b.hazardous_material,
        "is_village_industry": b.is_village_industry,
        "environmental_attributes": b.environmental_attributes,
        "is_synthetic": b.is_synthetic,
    }


@router.post("")
def create_business(payload: CreateBusinessRequest, db: Session = Depends(get_db)):
    b = BusinessProfile(**payload.model_dump())
    db.add(b)
    db.flush()
    db.add(
        AuditEvent(
            event_type="BUSINESS_PROFILE_CREATED",
            entity_type="business_profile",
            entity_id=b.id,
            actor="system",
            new_value={"industry": b.industry, "is_synthetic": b.is_synthetic},
        )
    )
    db.commit()
    db.refresh(b)
    return _payload(b)


@router.get("/{business_id}")
def get_business(business_id: str, db: Session = Depends(get_db)):
    b = db.get(BusinessProfile, business_id)
    if b is None:
        raise HTTPException(404, "Business profile not found")
    return _payload(b)


@router.get("")
def list_businesses(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    total = db.query(BusinessProfile).count()
    items = db.query(BusinessProfile).offset(offset).limit(limit).all()
    return {"total": total, "items": [_payload(b) for b in items]}
