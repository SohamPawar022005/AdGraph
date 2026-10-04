"""Deterministic rule evaluation engine.

Design goal (see project brief, "Deterministic code should handle: rule evaluation"):
this module has zero AI/LLM dependency. Given a Rule and a business profile dict, it
returns a tri-state verdict per condition (TRUE / FALSE / UNKNOWN) so that missing
business data never silently resolves to "does not apply" -- it resolves to
"insufficient_input", matching the brief's explicit INSUFFICIENT_INPUT error code.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from enum import Enum
from typing import Any, Dict, List, Optional

from .models import Condition, Rule

_MISSING = object()


class Verdict(str, Enum):
    TRUE = "true"
    FALSE = "false"
    UNKNOWN = "unknown"


_OPERATORS = {
    "equals", "eq",
    "not_equals", "neq",
    "contains",
    "in",
    "not_in",
    "gt", "gte", "lt", "lte",
    "exists", "not_exists",
    "date_before", "date_after", "date_on_or_before", "date_on_or_after",
}


def _get_field(profile: Dict[str, Any], dotted_field: str) -> Any:
    cur: Any = profile
    for part in dotted_field.split("."):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            return _MISSING
    return cur


def _coerce_date(value: Any) -> Optional[date]:
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None
    return None


def _eval_leaf(cond: Condition, profile: Dict[str, Any]) -> tuple[Verdict, str]:
    op = cond.operator
    if op not in _OPERATORS:
        raise ValueError(f"Unsupported operator: {op}")

    actual = _get_field(profile, cond.field)

    if op == "exists":
        verdict = Verdict.TRUE if actual is not _MISSING and actual is not None else Verdict.FALSE
        return verdict, f"{cond.field} exists -> {verdict.value}"
    if op == "not_exists":
        verdict = Verdict.TRUE if actual is _MISSING or actual is None else Verdict.FALSE
        return verdict, f"{cond.field} not_exists -> {verdict.value}"

    if actual is _MISSING:
        return Verdict.UNKNOWN, f"{cond.field} is not present in business profile"

    try:
        if op in ("equals", "eq"):
            verdict = Verdict.TRUE if actual == cond.value else Verdict.FALSE
        elif op in ("not_equals", "neq"):
            verdict = Verdict.TRUE if actual != cond.value else Verdict.FALSE
        elif op == "contains":
            verdict = Verdict.TRUE if cond.value in actual else Verdict.FALSE
        elif op == "in":
            verdict = Verdict.TRUE if actual in cond.value else Verdict.FALSE
        elif op == "not_in":
            verdict = Verdict.TRUE if actual not in cond.value else Verdict.FALSE
        elif op == "gt":
            verdict = Verdict.TRUE if actual > cond.value else Verdict.FALSE
        elif op == "gte":
            verdict = Verdict.TRUE if actual >= cond.value else Verdict.FALSE
        elif op == "lt":
            verdict = Verdict.TRUE if actual < cond.value else Verdict.FALSE
        elif op == "lte":
            verdict = Verdict.TRUE if actual <= cond.value else Verdict.FALSE
        elif op in ("date_before", "date_after", "date_on_or_before", "date_on_or_after"):
            actual_d = _coerce_date(actual)
            value_d = _coerce_date(cond.value)
            if actual_d is None or value_d is None:
                return Verdict.UNKNOWN, f"{cond.field} could not be parsed as a date"
            if op == "date_before":
                verdict = Verdict.TRUE if actual_d < value_d else Verdict.FALSE
            elif op == "date_after":
                verdict = Verdict.TRUE if actual_d > value_d else Verdict.FALSE
            elif op == "date_on_or_before":
                verdict = Verdict.TRUE if actual_d <= value_d else Verdict.FALSE
            else:
                verdict = Verdict.TRUE if actual_d >= value_d else Verdict.FALSE
        else:  # pragma: no cover - guarded above
            raise ValueError(f"Unsupported operator: {op}")
    except TypeError:
        return Verdict.UNKNOWN, f"{cond.field}={actual!r} not comparable with operator {op}"

    return verdict, f"{cond.field} {op} {cond.value!r} -> {verdict.value} (actual={actual!r})"


def _eval_condition(cond: Condition, profile: Dict[str, Any]) -> tuple[Verdict, List[str]]:
    if cond.field is not None:
        verdict, reason = _eval_leaf(cond, profile)
        return verdict, [reason]

    if cond.all is not None:
        results = [_eval_condition(c, profile) for c in cond.all]
        verdicts = [v for v, _ in results]
        reasons = [r for _, rs in results for r in rs]
        if Verdict.FALSE in verdicts:
            return Verdict.FALSE, reasons
        if Verdict.UNKNOWN in verdicts:
            return Verdict.UNKNOWN, reasons
        return Verdict.TRUE, reasons

    if cond.any is not None:
        results = [_eval_condition(c, profile) for c in cond.any]
        verdicts = [v for v, _ in results]
        reasons = [r for _, rs in results for r in rs]
        if Verdict.TRUE in verdicts:
            return Verdict.TRUE, reasons
        if Verdict.UNKNOWN in verdicts:
            return Verdict.UNKNOWN, reasons
        return Verdict.FALSE, reasons

    if cond.not_ is not None:
        verdict, reasons = _eval_condition(cond.not_, profile)
        if verdict == Verdict.TRUE:
            return Verdict.FALSE, reasons
        if verdict == Verdict.FALSE:
            return Verdict.TRUE, reasons
        return Verdict.UNKNOWN, reasons

    raise ValueError("Malformed condition")  # pragma: no cover


@dataclass
class EvaluationResult:
    rule_id: str
    rule_name: str
    jurisdiction: str
    status: str
    verdict: Verdict
    reasons: List[str]
    source: dict
    confidence: float
    required_approvals: List[str] = field(default_factory=list)
    required_documents: List[str] = field(default_factory=list)
    requirement_reasons: Dict[str, Optional[str]] = field(default_factory=dict)
    rule_version: str = "v1"
    error: Optional[str] = None


def _is_effective(rule: Rule, as_of: date) -> bool:
    if as_of < rule.effective.from_:
        return False
    if rule.effective.to is not None and as_of > rule.effective.to:
        return False
    return True


def evaluate(rule: Rule, business_profile: Dict[str, Any], as_of: Optional[date] = None) -> EvaluationResult:
    """Evaluate a single rule against a business profile.

    Returns an EvaluationResult whose `verdict` is TRUE/FALSE/UNKNOWN. UNKNOWN means
    the rule *could* apply but required business-profile fields were missing --
    callers should surface this as INSUFFICIENT_INPUT rather than silently dropping it.
    """
    as_of = as_of or date.today()

    base = EvaluationResult(
        rule_id=rule.id,
        rule_name=rule.name,
        jurisdiction=rule.jurisdiction,
        status=rule.status,
        verdict=Verdict.FALSE,
        reasons=[],
        source=rule.source.model_dump(),
        confidence=rule.confidence,
        rule_version=rule.version,
    )

    if rule.status in ("deprecated", "superseded", "rejected"):
        base.verdict = Verdict.FALSE
        base.error = "RULE_UNVERIFIED" if rule.status == "rejected" else None
        base.reasons = [f"Rule status is '{rule.status}'; not evaluated."]
        return base

    if not _is_effective(rule, as_of):
        base.verdict = Verdict.FALSE
        base.reasons = [
            f"Rule not effective on {as_of.isoformat()} "
            f"(effective {rule.effective.from_} to {rule.effective.to or 'open-ended'})."
        ]
        return base

    verdict, reasons = _eval_condition(rule.applies_when, business_profile)
    base.verdict = verdict
    base.reasons = reasons

    if verdict == Verdict.TRUE:
        for req in rule.requires:
            base.required_approvals.append(req.approval)
            base.requirement_reasons[req.approval] = req.reason
            base.required_documents.extend(req.documents)

    if verdict == Verdict.UNKNOWN:
        base.error = "INSUFFICIENT_INPUT"

    return base


def evaluate_all(
    rules: List[Rule], business_profile: Dict[str, Any], as_of: Optional[date] = None
) -> List[EvaluationResult]:
    """Evaluate every rule in `rules` and return all results (matched, unmatched, unknown)."""
    return [evaluate(r, business_profile, as_of=as_of) for r in rules]
