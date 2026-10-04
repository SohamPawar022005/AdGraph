from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.approvals import Approval, ApprovalDependency
from ..services import graph_service

router = APIRouter(prefix="/api/v1/approvals", tags=["approvals"])


def _approval_payload(a: Approval) -> dict:
    return {
        "id": a.id,
        "name": a.name,
        "description": a.description,
        "category": a.category,
        "authority_id": a.authority_id,
        "is_synthetic": a.is_synthetic,
        "status": a.status,
        "verification_status": a.verification_status,
        "source_document_id": a.source_document_id,
        "source_section": a.source_section,
        "applicable_industries": a.applicable_industries,
    }


@router.get("")
def list_approvals(db: Session = Depends(get_db)):
    return [_approval_payload(a) for a in db.query(Approval).all()]


@router.get("/graph")
def approval_graph(db: Session = Depends(get_db)):
    graph = graph_service.build_graph(db)
    return graph.to_dict()


@router.get("/{approval_id}")
def get_approval(approval_id: str, db: Session = Depends(get_db)):
    a = db.get(Approval, approval_id)
    if a is None:
        raise HTTPException(404, "Approval not found")
    return _approval_payload(a)


@router.get("/{approval_id}/dependencies")
def get_dependencies(approval_id: str, db: Session = Depends(get_db)):
    a = db.get(Approval, approval_id)
    if a is None:
        raise HTTPException(404, "Approval not found")
    graph = graph_service.build_graph(db)
    direct = db.query(ApprovalDependency).filter(ApprovalDependency.approval_id == approval_id).all()
    return {
        "approval_id": approval_id,
        "direct_dependencies": [
            {
                "depends_on": d.depends_on_approval_id,
                "dependency_type": d.dependency_type,
                "is_synthetic": d.is_synthetic,
                "confidence": d.dependency_confidence,
            }
            for d in direct
        ],
        "upstream_closure": graph.upstream(approval_id),
        "downstream_closure": graph.downstream(approval_id),
        "has_cycle_in_full_graph": graph.has_cycle(),
    }
