"""The single enforcement point for the human-verification workflow.

See docs/architecture/human-verification.md. This is the ONLY function in the
codebase permitted to change a regulatory entity's `verification_status`. Every
call writes an immutable VerificationRecord and an AuditEvent.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from ..models.approvals import Approval, ApprovalDependency
from ..models.audit import AuditEvent, VerificationRecord
from ..models.changes import RegulatoryChange
from ..models.regulatory import RuleVersion

ALLOWED_ACTIONS = {"approve", "reject", "edit", "flag", "deprecate", "supersede"}
REVIEWER_ROLES = {"REGULATORY_REVIEWER", "ADMIN"}

_ENTITY_MODELS = {
    "rule_version": RuleVersion,
    "approval": Approval,
    "approval_dependency": ApprovalDependency,
    "regulatory_change": RegulatoryChange,
}

_ACTION_TO_STATUS = {
    "approve": ("verified", "VERIFIED"),
    "reject": ("rejected", "REJECTED"),
    "deprecate": ("deprecated", None),
    "supersede": ("superseded", None),
}


class VerificationError(Exception):
    pass


def review_entity(
    db: Session,
    entity_type: str,
    entity_id: str,
    action: str,
    reviewer: str,
    reviewer_role: str,
    reason: Optional[str] = None,
) -> dict:
    if entity_type not in _ENTITY_MODELS:
        raise VerificationError(f"Unknown entity_type '{entity_type}'")
    if action not in ALLOWED_ACTIONS:
        raise VerificationError(f"Unknown action '{action}'")
    if reviewer_role not in REVIEWER_ROLES:
        raise VerificationError(
            f"Role '{reviewer_role}' may not perform regulatory review actions; "
            f"requires one of {sorted(REVIEWER_ROLES)}"
        )

    model = _ENTITY_MODELS[entity_type]
    entity = db.get(model, entity_id)
    if entity is None:
        raise VerificationError(f"{entity_type} '{entity_id}' not found")

    previous_status = getattr(entity, "verification_status", None)

    if action == "flag":
        note = f"FLAGGED by {reviewer}: {reason or 'no reason given'}"
        entity.notes = f"{entity.notes}\n{note}" if getattr(entity, "notes", None) else note
        new_status = previous_status
    elif action == "edit":
        # 'edit' here records that a human materially edited the candidate text/body
        # elsewhere (e.g. via a dedicated PATCH endpoint) -- this call re-queues it as
        # CANDIDATE so it is reviewed again rather than silently staying verified.
        if hasattr(entity, "verification_status"):
            entity.verification_status = "CANDIDATE"
        if hasattr(entity, "status"):
            entity.status = "candidate"
        new_status = "CANDIDATE"
    else:
        status_value, verification_value = _ACTION_TO_STATUS[action]
        if hasattr(entity, "status"):
            entity.status = status_value
        if verification_value and hasattr(entity, "verification_status"):
            entity.verification_status = verification_value
        new_status = verification_value or status_value

    if hasattr(entity, "verified_by"):
        entity.verified_by = reviewer
    if hasattr(entity, "verified_at"):
        entity.verified_at = datetime.now(timezone.utc)

    record = VerificationRecord(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        previous_status=previous_status,
        new_status=new_status,
        reviewer=reviewer,
        reason=reason,
    )
    db.add(record)

    event_type_map = {
        "approve": "RULE_VERIFIED",
        "reject": "RULE_REJECTED",
        "deprecate": "RULE_DEPRECATED",
        "supersede": "RULE_SUPERSEDED",
        "flag": "RULE_EDITED",
        "edit": "RULE_EDITED",
    }
    db.add(
        AuditEvent(
            event_type=event_type_map.get(action, "RULE_EDITED"),
            entity_type=entity_type,
            entity_id=entity_id,
            actor=reviewer,
            old_value={"verification_status": previous_status},
            new_value={"verification_status": new_status},
            reason=reason,
        )
    )
    db.commit()
    db.refresh(entity)
    return {
        "entity_type": entity_type,
        "entity_id": entity_id,
        "action": action,
        "previous_status": previous_status,
        "new_status": new_status,
        "reviewer": reviewer,
    }


def list_pending_review(db: Session, entity_type: str) -> list:
    model = _ENTITY_MODELS[entity_type]
    query = db.query(model)
    if hasattr(model, "verification_status"):
        query = query.filter(model.verification_status == "CANDIDATE")
    return query.all()
