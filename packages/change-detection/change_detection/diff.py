"""Section-aligned semantic diff between two regulation versions.

Input is a mapping of section_label -> text for the OLD and NEW document version
(produced upstream by packages/regulatory-parser). This module never fetches or
invents document content; if a section cannot be aligned it is reported as an
addition/deletion, never silently dropped.
"""

from __future__ import annotations

from dataclasses import dataclass
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
    old_section_label: Optional[str] = None
    new_section_label: Optional[str] = None
    matching_rationale: Optional[str] = None
    is_uncertain: bool = False
    evidence_tokens: Optional[dict] = None


def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


def compare_sections(
    old_sections: Dict[str, str], new_sections: Dict[str, str]
) -> List[ClauseChange]:
    """Compare two {section_label: text} maps and return all detected clause changes.

    Sections with byte-identical text after whitespace normalisation are not reported
    (no change). Everything else (added, removed, modified, moved, renumbered, uncertain)
    is reported explicitly with source references.
    """
    changes: List[ClauseChange] = []
    old_keys = set(old_sections)
    new_keys = set(new_sections)

    # 1. Directly aligned sections (matching section labels)
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
                old_section_label=label,
                new_section_label=label,
                matching_rationale="Exact section key alignment",
                is_uncertain=False,
                evidence_tokens=classification.evidence_tokens,
            )
        )

    # 2. Cross-alignment for unmatched keys (handles renumbering, moves, and uncertain matches)
    unmatched_old = set(old_keys - new_keys)
    unmatched_new = set(new_keys - old_keys)

    # Calculate similarity pairs between remaining old and new sections
    candidate_pairs: List[tuple[float, str, str]] = []
    for ok in unmatched_old:
        o_clean = " ".join(old_sections[ok].split())
        for nk in unmatched_new:
            n_clean = " ".join(new_sections[nk].split())
            sim = _similarity(o_clean, n_clean)
            candidate_pairs.append((sim, ok, nk))

    candidate_pairs.sort(key=lambda x: x[0], reverse=True)

    matched_old = set()
    matched_new = set()

    for sim, ok, nk in candidate_pairs:
        if ok in matched_old or nk in matched_new:
            continue
        if sim >= 0.70:
            # High similarity: Renumbered or Moved clause
            matched_old.add(ok)
            matched_new.add(nk)
            o_clean = " ".join(old_sections[ok].split())
            n_clean = " ".join(new_sections[nk].split())
            classification = classify_change(o_clean, n_clean) if o_clean != n_clean else None

            ch_type = ChangeType.RENUMBERED
            expl = f"Provision renumbered/relocated from {ok} to {nk} (similarity: {sim:.2f})."
            if classification and classification.change_type != ChangeType.MODIFICATION:
                expl += f" Also detected: {classification.explanation}"

            changes.append(
                ClauseChange(
                    section_label=f"{ok} → {nk}",
                    change_type=ch_type,
                    old_text=old_sections[ok],
                    new_text=new_sections[nk],
                    similarity_ratio=round(sim, 4),
                    confidence=round(sim, 2),
                    explanation=expl,
                    old_section_label=ok,
                    new_section_label=nk,
                    matching_rationale=f"High semantic/textual similarity ({sim:.2f}) indicates renumbered provision rather than deletion.",
                    is_uncertain=False,
                    evidence_tokens=classification.evidence_tokens if classification else {"renumbered": True},
                )
            )
        elif 0.40 <= sim < 0.70:
            # Moderate similarity: Flag as UNCERTAIN match for human review
            matched_old.add(ok)
            matched_new.add(nk)
            changes.append(
                ClauseChange(
                    section_label=f"{ok} ~ {nk}",
                    change_type=ChangeType.UNCERTAIN,
                    old_text=old_sections[ok],
                    new_text=new_sections[nk],
                    similarity_ratio=round(sim, 4),
                    confidence=round(sim, 2),
                    explanation=f"Uncertain alignment: {ok} exhibits moderate similarity ({sim:.2f}) to new {nk}. Requires reviewer confirmation.",
                    old_section_label=ok,
                    new_section_label=nk,
                    matching_rationale=f"Candidate alignment with moderate similarity ({sim:.2f}). Kept as UNCERTAIN pending review.",
                    is_uncertain=True,
                    evidence_tokens={"uncertain": True, "similarity": sim},
                )
            )

    # 3. Remaining old keys are true deletions
    for ok in sorted(unmatched_old - matched_old):
        changes.append(
            ClauseChange(
                section_label=ok,
                change_type=ChangeType.DELETION,
                old_text=old_sections[ok],
                new_text=None,
                similarity_ratio=0.0,
                confidence=1.0,
                explanation=f"Section {ok} present in old version, absent in new version.",
                old_section_label=ok,
                new_section_label=None,
                matching_rationale="No corresponding clause in new document version",
                is_uncertain=False,
            )
        )

    # 4. Remaining new keys are true additions
    for nk in sorted(unmatched_new - matched_new):
        changes.append(
            ClauseChange(
                section_label=nk,
                change_type=ChangeType.ADDITION,
                old_text=None,
                new_text=new_sections[nk],
                similarity_ratio=0.0,
                confidence=1.0,
                explanation=f"Section {nk} present in new version, absent in old version.",
                old_section_label=None,
                new_section_label=nk,
                matching_rationale="New clause with no corresponding section in previous document version",
                is_uncertain=False,
            )
        )

    return changes

