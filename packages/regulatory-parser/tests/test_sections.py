from regulatory_parser import extract_candidates, split_into_sections

SAMPLE = """
CHAPTER I
PRELIMINARY

1. Short title, extent and commencement.— (1) This Act may be called the
Maharashtra Khadi and Village Industries Act. (2) It extends to the whole of the
State of Maharashtra. (3) It shall come into force at once.

2. Definitions.— In this Act, unless the context otherwise requires,— (a) "Board"
means the Maharashtra State Khadi and Village Industries Board constituted under
this Act.

16. Rationalization of inspections.— The inspections under the provisions of
relevant law by the concerned authorities shall, as far as practicable, be conducted
jointly, based on random selection within 30 days of the Empowered Committee's
direction.
"""


def test_split_into_sections_finds_three_sections():
    sections = split_into_sections(SAMPLE)
    numbers = [s.number for s in sections]
    assert numbers == ["1", "2", "16"]
    assert "Short title" in sections[0].heading


def test_section_text_does_not_bleed_into_next_section():
    sections = split_into_sections(SAMPLE)
    assert "Definitions" not in sections[0].text


def test_extract_candidates_finds_obligation_authority_timeline():
    sections = split_into_sections(SAMPLE)
    inspections_section = next(s for s in sections if s.number == "16")
    candidates = extract_candidates(inspections_section.text)
    kinds = {c.kind for c in candidates}
    assert "obligation" in kinds
    assert "timeline" in kinds
    assert all(c.verification_status == "CANDIDATE" for c in candidates)


def test_no_sections_found_returns_empty_list():
    assert split_into_sections("no section markers here at all") == []
