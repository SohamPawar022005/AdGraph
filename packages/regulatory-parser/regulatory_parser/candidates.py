"""Heuristic candidate-obligation / candidate-authority / candidate-timeline extraction.

Everything produced here is a CANDIDATE (brief §18) -- never written to the verified
corpus without going through docs/architecture/human-verification.md. Confidence
scores are heuristic and intentionally conservative (capped at 0.6) because this is a
regex/keyword extractor, not a trained legal-NLP model.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List

_OBLIGATION_RE = re.compile(r"[^.]*\bshall\b[^.]*\.", re.IGNORECASE)
_AUTHORITY_RE = re.compile(
    r"\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,4}\s+"
    r"(?:Committee|Authority|Agency|Corporation|Board|Commission|Officer|Collector))\b"
)
_TIMELINE_RE = re.compile(r"\bwithin\s+(?:such\s+)?[\w\s]{0,30}?(\d+\s+(?:day|days|month|months|year|years))\b", re.IGNORECASE)


@dataclass
class CandidateExtraction:
    kind: str  # obligation | authority | timeline
    text: str
    confidence: float
    verification_status: str = "CANDIDATE"


def extract_candidates(section_text: str) -> List[CandidateExtraction]:
    results: List[CandidateExtraction] = []

    for m in _OBLIGATION_RE.finditer(section_text):
        results.append(CandidateExtraction(kind="obligation", text=m.group(0).strip(), confidence=0.55))

    seen_authorities = set()
    for m in _AUTHORITY_RE.finditer(section_text):
        name = m.group(1).strip()
        if name not in seen_authorities:
            seen_authorities.add(name)
            results.append(CandidateExtraction(kind="authority", text=name, confidence=0.5))

    for m in _TIMELINE_RE.finditer(section_text):
        results.append(CandidateExtraction(kind="timeline", text=m.group(0).strip(), confidence=0.5))

    return results
