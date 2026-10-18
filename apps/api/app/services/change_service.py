from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional

from change_detection import compare_sections
from sqlalchemy.orm import Session

from ..models.audit import AuditEvent
from ..models.changes import RegulatoryChange
from ..models.regulatory import RuleVersion


def analyze_and_persist(
    db: Session,
    old_sections: Dict[str, str],
    new_sections: Dict[str, str],
    old_source_document_id: Optional[str] = None,
    new_source_document_id: Optional[str] = None,
    is_synthetic: bool = False,
) -> List[RegulatoryChange]:
    clause_changes = compare_sections(old_sections, new_sections)
    created: List[RegulatoryChange] = []

    rule_versions = db.query(RuleVersion).all()

    for cc in clause_changes:
        affected_rule_ids = [
            rv.rule_id
            for rv in rule_versions
            if rv.source_section and (
                rv.source_section == cc.section_label
                or rv.source_section == getattr(cc, "old_section_label", None)
                or rv.source_section == getattr(cc, "new_section_label", None)
            )
        ]
        affected_approval_ids: List[str] = []
        for rv in rule_versions:
            if rv.rule_id in affected_rule_ids:
                body = dict(rv.rule_body)
                affected_approval_ids.extend(
                    r.get("approval") for r in body.get("requires", []) if r.get("approval")
                )

        change = RegulatoryChange(
            old_source_document_id=old_source_document_id,
            new_source_document_id=new_source_document_id,
            detected_at=datetime.now(timezone.utc),
            change_type=cc.change_type.value,
            section_label=cc.section_label,
            old_text=cc.old_text,
            new_text=cc.new_text,
            affected_rule_ids=affected_rule_ids,
            affected_approval_ids=sorted(set(affected_approval_ids)),
            affected_business_types=[],
            summary=cc.explanation,
            confidence=cc.confidence,
            verification_status="CANDIDATE",
            is_synthetic=is_synthetic,
            source_references={
                "old_section": getattr(cc, "old_section_label", None),
                "new_section": getattr(cc, "new_section_label", None),
                "old_doc_id": old_source_document_id,
                "new_doc_id": new_source_document_id,
            },
            matching_rationale=getattr(cc, "matching_rationale", None),
            is_uncertain=getattr(cc, "is_uncertain", False),
            evidence_tokens=getattr(cc, "evidence_tokens", None),
        )
        db.add(change)

        db.flush()
        db.add(
            AuditEvent(
                event_type="REGULATORY_CHANGE_DETECTED",
                entity_type="regulatory_change",
                entity_id=change.id,
                actor="system:change-detection",
                new_value={"change_type": cc.change_type.value, "section": cc.section_label},
            )
        )
        created.append(change)

    db.commit()
    for c in created:
        db.refresh(c)
    return created
