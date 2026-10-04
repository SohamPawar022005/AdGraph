"""Structural section splitter for Indian state Act text.

This is a deterministic, regex-based structural parser -- it only detects
"<number>. <Heading>.—" style section markers common to Maharashtra/Bombay Act
drafting conventions (as seen in the MID Act 1961, the MAITRI Act 2023, and the
Khadi & Village Industries Act 1960). It does NOT interpret the legal meaning of a
section; it only recovers section boundaries so downstream candidate-extraction and
human review have a stable unit of provenance ("Section N").

Output is always a CANDIDATE structural split -- see
docs/architecture/human-verification.md. A human reviewer should confirm the split
is correct (especially for OCR'd text, where a dropped digit can merge/split sections
incorrectly) before any derived Rule is marked verified.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List

_SECTION_HEADING_RE = re.compile(
    r"(?m)^\s*(?:Section\s*-?\s*)?(\d+[A-Z]{0,2})\.\s*([^.\n]{1,140}?)\.\s*[—\-]"
)


@dataclass
class ParsedSection:
    number: str
    heading: str
    text: str
    start_offset: int


def split_into_sections(raw_text: str) -> List[ParsedSection]:
    matches = list(_SECTION_HEADING_RE.finditer(raw_text))
    sections: List[ParsedSection] = []
    for i, m in enumerate(matches):
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(raw_text)
        body = raw_text[start:end].strip()
        sections.append(
            ParsedSection(
                number=m.group(1),
                heading=m.group(2).strip(),
                text=body,
                start_offset=start,
            )
        )
    return sections
