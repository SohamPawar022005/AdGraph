"""Section-aligned semantic diff between two regulation versions.

Input is a mapping of section_label -> text for the OLD and NEW document version
(produced upstream by packages/regulatory-parser). This module never fetches or
invents document content; if a section cannot be aligned it is reported as an
addition/deletion, never silently dropped.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from difflib import SequenceMatcher
from typing import Dict, List, Optional

from shared.enums import ChangeType

from .classify import classify_change


@dataclass
class ClauseChange:
    section_label: str
    change_type: ChangeType
    old_text: Optional[str]
    new_text: Optional[str]
    similarity_ratio: float
    confidence: float
    explanation: str


def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


def compare_sections(
    old_sections: Dict[str, str], new_sections: Dict[str, str]
) -> List[ClauseChange]:
    """Compare two {section_label: text} maps and return all detected clause changes.

    Sections with byte-identical text after whitespace normalisation are not reported
    (no change). Everything else (added, removed, modified) is reported explicitly.
    """
    changes: List[ClauseChange] = []
    old_keys = set(old_sections)
    new_keys = set(new_sections)

    for label in sorted(old_keys - new_keys):
        changes.append(
            ClauseChange(
                section_label=label,
                change_type=ChangeType.DELETION,
                old_text=old_sections[label],
                new_text=None,
                similarity_ratio=0.0,
                confidence=1.0,
                explanation=f"Section {label} present in old version, absent in new version.",
            )
        )

    for label in sorted(new_keys - old_keys):
        changes.append(
            ClauseChange(
                section_label=label,
                change_type=ChangeType.ADDITION,
                old_text=None,
                new_text=new_sections[label],
                similarity_ratio=0.0,
                confidence=1.0,
                explanation=f"Section {label} present in new version, absent in old version.",
            )
        )

    for label in sorted(old_keys & new_keys):
        old_text = " ".join(old_sections[label].split())
        new_text = " ".join(new_sections[label].split())
        if old_text == new_text:
            continue
        ratio = _similarity(old_text, new_text)
        classification = classify_change(old_text, new_text)
        changes.append(
            ClauseChange(
                section_label=label,
                change_type=classification.change_type,
                old_text=old_sections[label],
                new_text=new_sections[label],
                similarity_ratio=round(ratio, 4),
                confidence=classification.confidence,
                explanation=classification.explanation,
            )
        )

    return changes
