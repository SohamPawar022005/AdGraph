from datetime import date
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..db import get_db
from ..services import graph_service, rules_service

router = APIRouter(prefix="/api/v1/permissions", tags=["permissions"])


class DiscoverRequest(BaseModel):
    industry: str
    location: Optional[str] = None
    district: Optional[str] = None
    employees: Optional[int] = None
    investment: Optional[float] = None
    project_stage: Optional[str] = None
    land_type: Optional[str] = None
    hazardous_material: Optional[bool] = None
    is_village_industry: Optional[bool] = None
    jurisdiction: str = "Maharashtra"
    extra: Dict[str, Any] = {}


@router.post("/discover")
def discover_permissions(payload: DiscoverRequest, db: Session = Depends(get_db)):
    """Brief §64 example endpoint: POST /api/v1/permissions/discover.

    Mirrors the exact example request/response contract from the governing brief.
    Only returns permissions backed by rules currently loaded in the system (real
    candidate/verified rules derived from the three source Acts) -- it does NOT
    fabricate a generic licence catalogue. See docs/PROJECT-RESEARCH.md Limitations.
    """
    profile = payload.model_dump(exclude={"extra"})
    profile.update(payload.extra)
    result = rules_service.discover(db, profile)

    graph = graph_service.build_graph(db)
    dependencies = []
    for perm in result["permissions"]:
        approval_id = perm["approval_id"]
        upstream = graph.upstream(approval_id)
        if upstream:
            dependencies.append({"approval_id": approval_id, "depends_on": upstream})
    result["dependencies"] = dependencies
    return result
