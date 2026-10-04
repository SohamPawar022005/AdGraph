"""Deterministic application-workflow state machine (brief §49, §21).

This is intentionally a small hand-rolled FSM, not a BPMN/Temporal engine -- see
docs/research/open-source-landscape.md and docs/research/technical-landscape.md for
the explicit justification. Every transition this module allows produces the audit
event the caller should persist; invalid transitions raise rather than silently
succeeding or silently failing.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, Set

from shared.enums import WorkflowState

ALLOWED_TRANSITIONS: Dict[WorkflowState, Set[WorkflowState]] = {
    WorkflowState.SUBMITTED: {WorkflowState.UNDER_REVIEW, WorkflowState.WITHDRAWN},
    WorkflowState.UNDER_REVIEW: {
        WorkflowState.QUERY_RAISED,
        WorkflowState.INSPECTION_SCHEDULED,
        WorkflowState.APPROVED,
        WorkflowState.REJECTED,
        WorkflowState.ESCALATED,
        WorkflowState.WITHDRAWN,
    },
    WorkflowState.QUERY_RAISED: {WorkflowState.QUERY_RESPONDED, WorkflowState.WITHDRAWN},
    WorkflowState.QUERY_RESPONDED: {
        WorkflowState.UNDER_REVIEW,
        WorkflowState.INSPECTION_SCHEDULED,
        WorkflowState.APPROVED,
        WorkflowState.REJECTED,
    },
    WorkflowState.INSPECTION_SCHEDULED: {WorkflowState.INSPECTION_COMPLETED, WorkflowState.WITHDRAWN},
    WorkflowState.INSPECTION_COMPLETED: {
        WorkflowState.UNDER_REVIEW,
        WorkflowState.APPROVED,
        WorkflowState.REJECTED,
    },
    WorkflowState.ESCALATED: {WorkflowState.APPROVED, WorkflowState.REJECTED, WorkflowState.UNDER_REVIEW},
    WorkflowState.APPROVED: set(),
    WorkflowState.REJECTED: set(),
    WorkflowState.WITHDRAWN: set(),
}


class InvalidTransitionError(Exception):
    def __init__(self, current: WorkflowState, target: WorkflowState):
        super().__init__(f"Cannot transition workflow from {current.value} to {target.value}")
        self.current = current
        self.target = target


@dataclass
class TransitionResult:
    previous_state: WorkflowState
    new_state: WorkflowState
    occurred_at: datetime
    event_type: str = "WORKFLOW_EVENT"


def apply_transition(current: WorkflowState, target: WorkflowState) -> TransitionResult:
    allowed = ALLOWED_TRANSITIONS.get(current, set())
    if target not in allowed:
        raise InvalidTransitionError(current, target)
    return TransitionResult(
        previous_state=current, new_state=target, occurred_at=datetime.now(timezone.utc)
    )
