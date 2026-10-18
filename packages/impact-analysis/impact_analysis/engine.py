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
    evidence_paths: List[dict] = None
    has_uncertain_coverage: bool = False
    relationship_tiers: dict = None

    def __post_init__(self):
        if self.evidence_paths is None:
            self.evidence_paths = []
        if self.relationship_tiers is None:
            self.relationship_tiers = {"confirmed": 0, "candidate": 0, "synthetic": 0}


def analyze_impact(
    changed_rule_ids: List[str],
    rule_to_approvals: Dict[str, List[str]],
    approval_graph: ApprovalGraph,
    approval_to_business_types: Dict[str, Iterable[str]],
    active_applications: Optional[List[dict]] = None,
) -> ImpactReport:
    """active_applications: list of {"id": str, "approval_ids": [str, ...]}"""

    directly_affected: set[str] = set()
    evidence_paths: List[dict] = []
    tiers_count = {"confirmed": 0, "candidate": 0, "synthetic": 0}

    # Helper to check edge tiers
    edge_map = {}
    for e in approval_graph.edges():
        edge_map[(e.source_id, e.target_id)] = "synthetic" if e.is_synthetic else "confirmed"

    for rid in changed_rule_ids:
        direct_apps = rule_to_approvals.get(rid, [])
        for app_id in direct_apps:
            directly_affected.add(app_id)
            tier = "synthetic" if "SYNTH" in app_id.upper() or "SYNTH" in rid.upper() else "confirmed"
            tiers_count[tier] = tiers_count.get(tier, 0) + 1
            evidence_paths.append({
                "trigger_rule": rid,
                "source_approval": app_id,
                "target_approval": app_id,
                "impact_type": "direct",
                "path": [app_id],
                "path_summary": f"Direct link: Rule {rid} enforces approval {app_id}",
                "relationship": "enforces_rule",
                "tier": tier,
            })

    downstream_affected: set[str] = set()
    for approval_id in directly_affected:
        downstream_nodes = approval_graph.downstream(approval_id)
        for ds in downstream_nodes:
            if ds in directly_affected:
                continue
            downstream_affected.add(ds)
            # Find path in reverse graph (since edge direction is A -> B = A depends on B)
            # so downstream from B means finding path from ds to approval_id in regular graph
            path = approval_graph.shortest_path(ds, approval_id)
            display_path = list(reversed(path)) if path else [approval_id, ds]

            is_synth = any(
                edge_map.get((u, v)) == "synthetic" or "SYNTH" in u.upper() or "SYNTH" in v.upper()
                for u, v in zip(path[:-1], path[1:])
            ) if path and len(path) > 1 else False

            tier = "synthetic" if is_synth else "confirmed"
            tiers_count[tier] = tiers_count.get(tier, 0) + 1

            evidence_paths.append({
                "trigger_rule": next((r for r in changed_rule_ids if approval_id in rule_to_approvals.get(r, [])), "unknown"),
                "source_approval": approval_id,
                "target_approval": ds,
                "impact_type": "downstream",
                "path": display_path,
                "path_summary": f"Downstream dependency: {' -> '.join(display_path)}",
                "relationship": "depends_on",
                "tier": tier,
            })

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

    has_uncertain_coverage = len(changed_rule_ids) > 0 and len(directly_affected) == 0

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

    if has_uncertain_coverage:
        explanation += (
            " NOTE: No direct approval relationships were discovered in the existing verified graph "
            "for the changed rule(s). This may reflect incomplete graph coverage rather than zero compliance impact. "
            "Reviewers should inspect if additional approval rules require mapping."
        )

    return ImpactReport(
        changed_rule_ids=list(changed_rule_ids),
        directly_affected_approvals=sorted(directly_affected),
        downstream_affected_approvals=sorted(downstream_affected),
        affected_business_types=sorted(affected_business_types),
        affected_application_ids=affected_application_ids,
        impact_score=round(score, 4),
        explanation=explanation,
        evidence_paths=evidence_paths,
        has_uncertain_coverage=has_uncertain_coverage,
        relationship_tiers=tiers_count,
    )

