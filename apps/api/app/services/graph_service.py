from __future__ import annotations

from typing import Dict, List

from graph_engine import ApprovalGraph, GraphEdge, GraphNode
from sqlalchemy.orm import Session

from ..models.approvals import Approval, ApprovalDependency


def build_graph(db: Session) -> ApprovalGraph:
    approvals = db.query(Approval).all()
    deps = db.query(ApprovalDependency).all()
    nodes = [
        GraphNode(
            id=a.id,
            label=a.name,
            kind="approval",
            metadata={
                "category": a.category,
                "is_synthetic": a.is_synthetic,
                "verification_status": a.verification_status,
            },
        )
        for a in approvals
    ]
    edges = [
        GraphEdge(
            source_id=d.approval_id,
            target_id=d.depends_on_approval_id,
            relation=d.dependency_type,
            confidence=d.dependency_confidence,
            is_synthetic=d.is_synthetic,
            provenance=d.source_url or d.source_section,
        )
        for d in deps
    ]
    return ApprovalGraph.from_edges(nodes, edges)


def rule_to_approvals_map(db: Session) -> Dict[str, List[str]]:
    from ..models.regulatory import RuleVersion

    mapping: Dict[str, List[str]] = {}
    for rv in db.query(RuleVersion).all():
        body = dict(rv.rule_body)
        approvals = [r.get("approval") for r in body.get("requires", []) if r.get("approval")]
        if approvals:
            mapping[rv.rule_id] = approvals
    return mapping


def approval_to_industries_map(db: Session) -> Dict[str, List[str]]:
    """Map approval id -> list of industries it applies to.

    `applicable_industries is None` is a deliberate catalogue choice meaning "applies
    broadly, not industry-restricted" (see scripts/seed_real_corpus.py) and is
    expanded to the full reference industry list here so impact-analysis business-type
    breadth isn't silently undercounted as "applies to nothing".
    """
    from shared import ALL_INDUSTRIES

    return {
        a.id: (a.applicable_industries if a.applicable_industries is not None else list(ALL_INDUSTRIES))
        for a in db.query(Approval).all()
    }
