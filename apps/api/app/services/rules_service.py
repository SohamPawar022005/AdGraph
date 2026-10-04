"""Bridges DB-stored RuleVersion rows and the pure-python rules_engine package."""

from __future__ import annotations

from datetime import date
from typing import Any, Dict, List, Optional

from rules_engine import Rule as EngineRule
from rules_engine.engine import EvaluationResult, Verdict, evaluate_all
from sqlalchemy.orm import Session

from ..models.regulatory import Rule, RuleVersion


def load_engine_rules(db: Session, include_candidate: bool = True) -> List[EngineRule]:
    """Load the latest version of every Rule as an engine-ready Rule object.

    Only rules with status in (verified, candidate) are loaded (deprecated/superseded/
    rejected versions are never evaluated for new applicants, matching brief §36:
    "Rules must be immutable once published" / superseded versions stop applying).
    """
    query = db.query(RuleVersion)
    statuses = ["verified"] + (["candidate"] if include_candidate else [])
    query = query.filter(RuleVersion.status.in_(statuses))
    engine_rules = []
    for rv in query.all():
        body = dict(rv.rule_body)
        payload = {
            "id": rv.rule_id,
            "name": body.get("name", rv.rule_id),
            "jurisdiction": body.get("jurisdiction", "Maharashtra"),
            "version": rv.version,
            "supersedes": body.get("supersedes"),
            "source": {
                "document": body.get("source", {}).get("document", rv.source_document_id or "unknown"),
                "document_version": body.get("source", {}).get("document_version"),
                "section": rv.source_section or body.get("source", {}).get("section"),
                "page": rv.source_page,
                "url": rv.source_url or body.get("source", {}).get("url"),
            },
            "effective": {
                "from": rv.effective_from.isoformat(),
                "to": rv.effective_to.isoformat() if rv.effective_to else None,
            },
            "status": rv.status,
            "applies_when": body["applies_when"],
            "requires": body.get("requires", []),
            "actions": body.get("actions", []),
            "confidence": rv.confidence if rv.confidence is not None else body.get("confidence", 1.0),
            "notes": rv.notes or body.get("notes", ""),
            "tags": body.get("tags", []),
        }
        engine_rules.append(EngineRule.model_validate(payload))
    return engine_rules


def discover(
    db: Session, business_profile: Dict[str, Any], as_of: Optional[date] = None
) -> Dict[str, Any]:
    """Run evaluate_all and shape the result per brief §64's required response contract."""
    engine_rules = load_engine_rules(db)
    results: List[EvaluationResult] = evaluate_all(engine_rules, business_profile, as_of=as_of)

    matched = [r for r in results if r.verdict == Verdict.TRUE]
    insufficient = [r for r in results if r.verdict == Verdict.UNKNOWN]

    permissions, documents, sources, verification_statuses = [], [], [], []
    seen_docs = set()
    for r in matched:
        for approval_id in r.required_approvals:
            permissions.append(
                {
                    "approval_id": approval_id,
                    "rule_id": r.rule_id,
                    "rule_name": r.rule_name,
                    "reason": r.requirement_reasons.get(approval_id) or "; ".join(r.reasons),
                    "why": "; ".join(r.reasons),
                    "source": r.source,
                    "confidence": r.confidence,
                    "verification_status": r.status,
                }
            )
        for doc in r.required_documents:
            if doc not in documents:
                documents.append(doc)
        doc_key = (r.source.get("document"), r.source.get("section"))
        if doc_key not in seen_docs:
            seen_docs.add(doc_key)
            sources.append({**r.source, "rule_id": r.rule_id, "verification_status": r.status})
        verification_statuses.append({"rule_id": r.rule_id, "status": r.status})

    return {
        "permissions": permissions,
        "documents": documents,
        "dependencies": [],  # filled in by graph_service in the permissions router
        "sources": sources,
        "verification_status": verification_statuses,
        "insufficient_input": [
            {"rule_id": r.rule_id, "rule_name": r.rule_name, "reasons": r.reasons}
            for r in insufficient
        ],
        "disclaimer": (
            "This is a candidate permission discovery result based on PermitGraph's "
            "configured source rules. It is NOT a legal determination, does not replace "
            "the statutory Online Wizard Module (MAITRI Act 2023, s.20), and must be "
            "verified against the current Official Gazette and the relevant Competent "
            "Authority before being relied upon."
        ),
    }
