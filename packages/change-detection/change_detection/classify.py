"""Deterministic, explainable change classification.

Per the project brief (§22, §34), this is intentionally NOT a trained ML/LLM model.
It is a transparent, testable set of heuristics over the text diff so every
classification can be explained ("this was classified as a threshold_change because
the numeric tokens [50] -> [100] changed"). An LLM-based classifier MAY be layered on
top in a future release as a *candidate* re-ranker, never as the source of truth.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from shared.enums import ChangeType

_NUMBER_RE = re.compile(r"\b\d[\d,]*(?:\.\d+)?\b")
_DAYS_RE = re.compile(r"\b\d+\s*(?:day|days|month|months|year|years)\b", re.IGNORECASE)
_DATE_RE = re.compile(r"\b\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4}\b", re.IGNORECASE)
_AUTHORITY_HINTS = (
    "committee", "authority", "officer", "collector", "commissioner", "corporation",
    "department", "government", "board", "agency",
)
_DOCUMENT_HINTS = ("document", "certificate", "furnish", "submit", "application", "undertaking", "form")
_APPLICABILITY_HINTS = ("applicable", "shall apply", "extends to", "means", "includes", "undertaking engaged")
_DEFINITION_HINTS = ("means", "“", "\"")


@dataclass
class ClassificationResult:
    change_type: ChangeType
    confidence: float
    explanation: str
    evidence_tokens: dict = None

    def __post_init__(self):
        if self.evidence_tokens is None:
            self.evidence_tokens = {}


def _tokens_with_hints(text: str, hints) -> set[str]:
    lowered = text.lower()
    return {h for h in hints if h in lowered}


def classify_change(old_text: str, new_text: str) -> ClassificationResult:
    """Classify a modification between two non-identical clause texts."""
    old_numbers = _NUMBER_RE.findall(old_text)
    new_numbers = _NUMBER_RE.findall(new_text)
    old_days = _DAYS_RE.findall(old_text.lower())
    new_days = _DAYS_RE.findall(new_text.lower())
    old_dates = _DATE_RE.findall(old_text)
    new_dates = _DATE_RE.findall(new_text)

    if old_days != new_days or old_dates != new_dates:
        return ClassificationResult(
            ChangeType.DEADLINE_CHANGE,
            0.85,
            f"Time-period/date tokens changed: {old_days + old_dates!r} -> {new_days + new_dates!r}",
            evidence_tokens={"old": old_days + old_dates, "new": new_days + new_dates, "kind": "deadline"},
        )

    if old_numbers != new_numbers:
        return ClassificationResult(
            ChangeType.THRESHOLD_CHANGE,
            0.8,
            f"Numeric tokens changed: {old_numbers!r} -> {new_numbers!r}",
            evidence_tokens={"old": old_numbers, "new": new_numbers, "kind": "threshold"},
        )

    old_auth = _tokens_with_hints(old_text, _AUTHORITY_HINTS)
    new_auth = _tokens_with_hints(new_text, _AUTHORITY_HINTS)
    if old_auth != new_auth:
        return ClassificationResult(
            ChangeType.AUTHORITY_CHANGE,
            0.6,
            f"Authority-related terms changed: {sorted(old_auth)} -> {sorted(new_auth)}",
            evidence_tokens={"old": sorted(old_auth), "new": sorted(new_auth), "kind": "authority"},
        )

    old_docs = _tokens_with_hints(old_text, _DOCUMENT_HINTS)
    new_docs = _tokens_with_hints(new_text, _DOCUMENT_HINTS)
    if old_docs != new_docs:
        return ClassificationResult(
            ChangeType.DOCUMENT_REQUIREMENT_CHANGE,
            0.55,
            f"Document/filing-related terms changed: {sorted(old_docs)} -> {sorted(new_docs)}",
            evidence_tokens={"old": sorted(old_docs), "new": sorted(new_docs), "kind": "document"},
        )

    if any(h in old_text.lower() or h in new_text.lower() for h in _DEFINITION_HINTS[:1]):
        return ClassificationResult(
            ChangeType.DEFINITION_CHANGE,
            0.5,
            "Clause contains a definition pattern ('means ...') and text differs.",
            evidence_tokens={"pattern": "definition", "kind": "definition"},
        )

    old_appl = _tokens_with_hints(old_text, _APPLICABILITY_HINTS)
    new_appl = _tokens_with_hints(new_text, _APPLICABILITY_HINTS)
    if old_appl != new_appl:
        return ClassificationResult(
            ChangeType.APPLICABILITY_CHANGE,
            0.5,
            f"Applicability-scope terms changed: {sorted(old_appl)} -> {sorted(new_appl)}",
            evidence_tokens={"old": sorted(old_appl), "new": sorted(new_appl), "kind": "applicability"},
        )

    return ClassificationResult(
        ChangeType.MODIFICATION,
        0.4,
        "Text differs but no specific pattern (threshold/deadline/authority/document/"
        "applicability/definition) was matched; flagged as a generic modification for "
        "human review.",
        evidence_tokens={"kind": "generic_text"},
    )


def generate_plain_language_explanation(
    change_type: ChangeType,
    old_text: str | None,
    new_text: str | None,
    section_label: str | None = None,
    evidence_tokens: dict | None = None,
) -> str:
    """Produce an evidence-grounded plain-language explanation of a detected change."""
    sec = f"in {section_label}" if section_label else "in clause"
    if change_type == ChangeType.ADDITION:
        return f"New regulatory provision added {sec}. Adds new requirements or authorities not present in the previous version."
    if change_type == ChangeType.DELETION:
        return f"Regulatory provision removed {sec}. Previous requirements under this clause have been repealed or omitted."
    if change_type == ChangeType.RENUMBERED:
        return f"Provision renumbered or reorganized {sec}. The core text has been carried over under a different section reference."
    if change_type == ChangeType.MOVED:
        return f"Provision moved {sec}. Clause content relocated to another section structure."
    if change_type == ChangeType.UNCERTAIN:
        return f"Candidate match with uncertainty {sec}. Requires human verification to determine whether this represents an amendment or separate requirement."
    if change_type == ChangeType.DEADLINE_CHANGE:
        tokens = evidence_tokens or {}
        old_val = ", ".join(tokens.get("old", [])) or "previous timeframe"
        new_val = ", ".join(tokens.get("new", [])) or "updated timeframe"
        return f"Compliance timeline updated {sec}: statutory period modified from '{old_val}' to '{new_val}'."
    if change_type == ChangeType.THRESHOLD_CHANGE:
        tokens = evidence_tokens or {}
        old_val = ", ".join(tokens.get("old", [])) or "previous threshold"
        new_val = ", ".join(tokens.get("new", [])) or "updated threshold"
        return f"Eligibility or quantitative threshold modified {sec}: values changed from '{old_val}' to '{new_val}'."
    if change_type == ChangeType.AUTHORITY_CHANGE:
        tokens = evidence_tokens or {}
        old_val = ", ".join(tokens.get("old", [])) or "previous authority"
        new_val = ", ".join(tokens.get("new", [])) or "new authority"
        return f"Designated regulatory authority or officer modified {sec}: jurisdiction/authority references updated from '{old_val}' to '{new_val}'."
    if change_type == ChangeType.DOCUMENT_REQUIREMENT_CHANGE:
        return f"Filing, certification, or documentation requirements modified {sec}."
    if change_type == ChangeType.APPLICABILITY_CHANGE:
        return f"Scope of industrial applicability or eligible business categories amended {sec}."
    if change_type == ChangeType.DEFINITION_CHANGE:
        return f"Statutory definition updated {sec}. May affect downstream interpretations of key terms."
    return f"Wording amended {sec}. Please review the old and new text comparison."

