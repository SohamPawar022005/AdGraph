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
from typing import List

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
        )

    if old_numbers != new_numbers:
        return ClassificationResult(
            ChangeType.THRESHOLD_CHANGE,
            0.8,
            f"Numeric tokens changed: {old_numbers!r} -> {new_numbers!r}",
        )

    old_auth = _tokens_with_hints(old_text, _AUTHORITY_HINTS)
    new_auth = _tokens_with_hints(new_text, _AUTHORITY_HINTS)
    if old_auth != new_auth:
        return ClassificationResult(
            ChangeType.AUTHORITY_CHANGE,
            0.6,
            f"Authority-related terms changed: {sorted(old_auth)} -> {sorted(new_auth)}",
        )

    old_docs = _tokens_with_hints(old_text, _DOCUMENT_HINTS)
    new_docs = _tokens_with_hints(new_text, _DOCUMENT_HINTS)
    if old_docs != new_docs:
        return ClassificationResult(
            ChangeType.DOCUMENT_REQUIREMENT_CHANGE,
            0.55,
            f"Document/filing-related terms changed: {sorted(old_docs)} -> {sorted(new_docs)}",
        )

    if any(h in old_text.lower() or h in new_text.lower() for h in _DEFINITION_HINTS[:1]):
        return ClassificationResult(
            ChangeType.DEFINITION_CHANGE,
            0.5,
            "Clause contains a definition pattern ('means ...') and text differs.",
        )

    old_appl = _tokens_with_hints(old_text, _APPLICABILITY_HINTS)
    new_appl = _tokens_with_hints(new_text, _APPLICABILITY_HINTS)
    if old_appl != new_appl:
        return ClassificationResult(
            ChangeType.APPLICABILITY_CHANGE,
            0.5,
            f"Applicability-scope terms changed: {sorted(old_appl)} -> {sorted(new_appl)}",
        )

    return ClassificationResult(
        ChangeType.MODIFICATION,
        0.4,
        "Text differs but no specific pattern (threshold/deadline/authority/document/"
        "applicability/definition) was matched; flagged as a generic modification for "
        "human review.",
    )
