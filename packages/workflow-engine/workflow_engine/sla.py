"""SLA timer logic (brief §21).

Per the project's non-fabrication rule, PermitGraph does NOT hard-code any real
statutory deadline here -- the MAITRI Act's "specified time limit" is defined by
reference to rules prescribed under the Maharashtra Right to Public Services Act,
2015 "or any other relevant law" (MAITRI Act 2023, s.2(m)), which are not part of the
three supplied source Acts. `SLAConfig.limit_days` must therefore always be supplied
by the caller (from verified prescribed-rule data when available, or explicitly
synthetic/test data otherwise) -- this module has no built-in default statutory number.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

from shared.enums import SLAState


@dataclass
class SLAConfig:
    limit_days: int
    approaching_threshold_days: int = 2  # warn when this many days remain
    is_synthetic: bool = True  # True unless limit_days is sourced from a verified prescribed rule
    source_note: str = (
        "No statutory day-count was present in the supplied source Acts; this limit "
        "is illustrative/synthetic unless source_note is overridden with a verified "
        "citation to the prescribed rule."
    )


@dataclass
class SLASnapshot:
    state: SLAState
    started_at: Optional[datetime]
    deadline: Optional[datetime]
    elapsed_days: float
    remaining_days: Optional[float]
    is_breached: bool


class SLAClock:
    """Tracks a single application's SLA, with pause/resume support."""

    def __init__(self, config: SLAConfig):
        self.config = config
        self.started_at: Optional[datetime] = None
        self.completed_at: Optional[datetime] = None
        self.escalated: bool = False
        self._pauses: List[Tuple[datetime, Optional[datetime]]] = []

    def start(self, at: Optional[datetime] = None) -> None:
        self.started_at = at or datetime.now(timezone.utc)

    def pause(self, at: Optional[datetime] = None) -> None:
        self._pauses.append((at or datetime.now(timezone.utc), None))

    def resume(self, at: Optional[datetime] = None) -> None:
        if self._pauses and self._pauses[-1][1] is None:
            start, _ = self._pauses[-1]
            self._pauses[-1] = (start, at or datetime.now(timezone.utc))

    def complete(self, at: Optional[datetime] = None) -> None:
        self.completed_at = at or datetime.now(timezone.utc)

    def _paused_duration(self, as_of: datetime) -> timedelta:
        total = timedelta()
        for start, end in self._pauses:
            total += (end or as_of) - start
        return total

    def _is_paused(self, as_of: datetime) -> bool:
        return bool(self._pauses) and self._pauses[-1][1] is None and self._pauses[-1][0] <= as_of

    def snapshot(self, as_of: Optional[datetime] = None) -> SLASnapshot:
        as_of = as_of or datetime.now(timezone.utc)
        if self.started_at is None:
            return SLASnapshot(SLAState.NOT_STARTED, None, None, 0.0, None, False)

        if self.completed_at is not None:
            elapsed = (self.completed_at - self.started_at) - self._paused_duration(self.completed_at)
            return SLASnapshot(
                SLAState.COMPLETED,
                self.started_at,
                self.started_at + timedelta(days=self.config.limit_days),
                round(elapsed.total_seconds() / 86400, 2),
                None,
                is_breached=elapsed.days > self.config.limit_days,
            )

        deadline = self.started_at + timedelta(days=self.config.limit_days)
        elapsed = (as_of - self.started_at) - self._paused_duration(as_of)
        elapsed_days = elapsed.total_seconds() / 86400
        remaining_days = self.config.limit_days - elapsed_days

        if self._is_paused(as_of):
            state = SLAState.PAUSED
        elif self.escalated:
            state = SLAState.ESCALATED
        elif remaining_days < 0:
            state = SLAState.OVERDUE
        elif remaining_days <= self.config.approaching_threshold_days:
            state = SLAState.APPROACHING_DEADLINE
        else:
            state = SLAState.RUNNING

        return SLASnapshot(
            state=state,
            started_at=self.started_at,
            deadline=deadline,
            elapsed_days=round(elapsed_days, 2),
            remaining_days=round(remaining_days, 2),
            is_breached=remaining_days < 0,
        )

    def escalate(self) -> None:
        self.escalated = True
