"""Impact analysis: given changed rule(s), find affected approvals, documents,
business categories and (optionally) active applications, via graph traversal.

This module performs NO legal judgement. It answers a structural question --
"what is downstream of what changed, given the dependency graph we have on file" --
and always reports its method so the score is falsifiable/reviewable, never a
black-box "compliance score."
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional

from graph_engine import ApprovalGraph

IMPACT_SCORE_METHODOLOGY = (
    "impact_score = 0.4 * min(len(directly_affected_approvals), 5) / 5 "
    "+ 0.4 * min(len(downstream_affected_approvals), 10) / 10 "
    "+ 0.2 * min(len(affected_business_types), 5) / 5. "
    "This is a bounded [0,1] heuristic PRIORITISATION signal based only on graph "
    "breadth, not a legal risk or compliance score. It does not consider severity, "
    "penalties, or likelihood -- those are not derivable from the dependency graph "
    "alone and PermitGraph does not fabricate them."
)


@dataclass
class ImpactReport:
    changed_rule_ids: List[str]
    directly_affected_approvals: List[str]
    downstream_affected_approvals: List[str]
    affected_business_types: List[str]
    affected_application_ids: List[str]
    impact_score: float
    methodology: str = IMPACT_SCORE_METHODOLOGY
    explanation: str = ""
    disclaimer: str = (
        "This impact analysis is a structural traversal of the approval dependency "
        "graph on file. It is NOT a legal determination and does not replace review "
        "by a qualified regulatory reviewer. Verify affected rules/approvals before "
        "acting."
    )


def analyze_impact(
    changed_rule_ids: List[str],
    rule_to_approvals: Dict[str, List[str]],
    approval_graph: ApprovalGraph,
    approval_to_business_types: Dict[str, Iterable[str]],
    active_applications: Optional[List[dict]] = None,
) -> ImpactReport:
    """active_applications: list of {"id": str, "approval_ids": [str, ...]}"""

    directly_affected: set[str] = set()
    for rid in changed_rule_ids:
        directly_affected.update(rule_to_approvals.get(rid, []))

    downstream_affected: set[str] = set()
    for approval_id in directly_affected:
        downstream_affected.update(approval_graph.downstream(approval_id))
    downstream_affected -= directly_affected

    all_affected_approvals = directly_affected | downstream_affected

    affected_business_types: set[str] = set()
    for approval_id in all_affected_approvals:
        affected_business_types.update(approval_to_business_types.get(approval_id, []))

    affected_application_ids: List[str] = []
    for app in active_applications or []:
        if set(app.get("approval_ids", [])) & all_affected_approvals:
            affected_application_ids.append(app["id"])

    score = (
        0.4 * min(len(directly_affected), 5) / 5
        + 0.4 * min(len(downstream_affected), 10) / 10
        + 0.2 * min(len(affected_business_types), 5) / 5
    )

    explanation = (
        f"{len(changed_rule_ids)} changed rule(s) directly affect "
        f"{len(directly_affected)} approval(s): {sorted(directly_affected)}. "
        f"Traversing the approval dependency graph downstream from those approvals "
        f"affects {len(downstream_affected)} further approval(s): "
        f"{sorted(downstream_affected)}. Combined, this touches "
        f"{len(affected_business_types)} business categor(y/ies): "
        f"{sorted(affected_business_types)}, and {len(affected_application_ids)} "
        f"currently tracked active application(s)."
    )

    return ImpactReport(
        changed_rule_ids=list(changed_rule_ids),
        directly_affected_approvals=sorted(directly_affected),
        downstream_affected_approvals=sorted(downstream_affected),
        affected_business_types=sorted(affected_business_types),
        affected_application_ids=affected_application_ids,
        impact_score=round(score, 4),
        explanation=explanation,
    )
