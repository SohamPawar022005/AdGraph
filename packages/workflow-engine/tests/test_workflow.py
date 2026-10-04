from datetime import datetime, timedelta, timezone

import pytest
from shared.enums import SLAState, WorkflowState
from workflow_engine import SLAClock, SLAConfig, apply_transition
from workflow_engine.workflow import InvalidTransitionError


def test_valid_transition():
    result = apply_transition(WorkflowState.SUBMITTED, WorkflowState.UNDER_REVIEW)
    assert result.new_state == WorkflowState.UNDER_REVIEW


def test_invalid_transition_raises():
    with pytest.raises(InvalidTransitionError):
        apply_transition(WorkflowState.SUBMITTED, WorkflowState.APPROVED)


def test_terminal_states_have_no_outgoing_transitions():
    with pytest.raises(InvalidTransitionError):
        apply_transition(WorkflowState.APPROVED, WorkflowState.UNDER_REVIEW)


def test_sla_not_started():
    clock = SLAClock(SLAConfig(limit_days=30))
    snap = clock.snapshot()
    assert snap.state == SLAState.NOT_STARTED


def test_sla_running_then_approaching_then_overdue():
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    clock = SLAClock(SLAConfig(limit_days=10, approaching_threshold_days=2))
    clock.start(at=start)

    running_snap = clock.snapshot(as_of=start + timedelta(days=1))
    assert running_snap.state == SLAState.RUNNING

    approaching_snap = clock.snapshot(as_of=start + timedelta(days=9))
    assert approaching_snap.state == SLAState.APPROACHING_DEADLINE

    overdue_snap = clock.snapshot(as_of=start + timedelta(days=11))
    assert overdue_snap.state == SLAState.OVERDUE
    assert overdue_snap.is_breached is True


def test_sla_pause_resume_excludes_paused_time():
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    clock = SLAClock(SLAConfig(limit_days=10))
    clock.start(at=start)
    clock.pause(at=start + timedelta(days=2))
    clock.resume(at=start + timedelta(days=5))
    # 7 real days elapsed, but 3 days were paused -> 4 elapsed SLA days
    snap = clock.snapshot(as_of=start + timedelta(days=7))
    assert snap.elapsed_days == pytest.approx(4.0, abs=0.01)
    assert snap.state == SLAState.RUNNING


def test_sla_escalation():
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    clock = SLAClock(SLAConfig(limit_days=10))
    clock.start(at=start)
    clock.escalate()
    snap = clock.snapshot(as_of=start + timedelta(days=1))
    assert snap.state == SLAState.ESCALATED


def test_sla_completed():
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    clock = SLAClock(SLAConfig(limit_days=10))
    clock.start(at=start)
    clock.complete(at=start + timedelta(days=4))
    snap = clock.snapshot()
    assert snap.state == SLAState.COMPLETED
    assert snap.is_breached is False
