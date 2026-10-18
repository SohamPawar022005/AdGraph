from change_detection import compare_sections
from shared.enums import ChangeType


def test_identical_sections_produce_no_changes():
    old = {"Section 3": "An entrepreneur may apply through the Single Window System."}
    new = dict(old)
    assert compare_sections(old, new) == []


def test_added_section_detected():
    old = {"Section 3": "text"}
    new = {"Section 3": "text", "Section 4": "new text"}
    changes = compare_sections(old, new)
    assert len(changes) == 1
    assert changes[0].change_type == ChangeType.ADDITION
    assert changes[0].section_label == "Section 4"


def test_removed_section_detected():
    old = {"Section 3": "text", "Section 4": "old text"}
    new = {"Section 3": "text"}
    changes = compare_sections(old, new)
    assert len(changes) == 1
    assert changes[0].change_type == ChangeType.DELETION


def test_threshold_change_detected():
    old = {"Section 5": "An undertaking with 50 employees must comply."}
    new = {"Section 5": "An undertaking with 100 employees must comply."}
    changes = compare_sections(old, new)
    assert changes[0].change_type == ChangeType.THRESHOLD_CHANGE
    assert changes[0].confidence > 0.5


def test_deadline_change_detected():
    old = {"Section 18": "The Committee shall decide within 30 days."}
    new = {"Section 18": "The Committee shall decide within 60 days."}
    changes = compare_sections(old, new)
    assert changes[0].change_type == ChangeType.DEADLINE_CHANGE


def test_generic_modification_fallback():
    old = {"Section 2": "The Nodal Agency shall guide entrepreneurs."}
    new = {"Section 2": "The Nodal Agency shall assist entrepreneurs."}
    changes = compare_sections(old, new)
    assert changes[0].change_type in (ChangeType.MODIFICATION, ChangeType.DOCUMENT_REQUIREMENT_CHANGE, ChangeType.APPLICABILITY_CHANGE)
    assert 0.0 <= changes[0].similarity_ratio <= 1.0


def test_renumbered_clause_detected():
    old = {"Section 14": "Every industrial unit in an industrial area shall pay the prescribed service charges annually."}
    new = {"Section 16": "Every industrial unit in an industrial area shall pay the prescribed service charges annually."}
    changes = compare_sections(old, new)
    assert len(changes) == 1
    assert changes[0].change_type == ChangeType.RENUMBERED
    assert changes[0].old_section_label == "Section 14"
    assert changes[0].new_section_label == "Section 16"
    assert changes[0].similarity_ratio == 1.0
    assert not changes[0].is_uncertain


def test_uncertain_match_detected_for_partial_similarity():
    old = {"Section 10": "The Authority may conduct environmental audits of manufacturing units twice a year."}
    new = {"Section 22": "The Authority may inspect and audit industrial units for compliance with standards."}
    changes = compare_sections(old, new)
    assert len(changes) == 1
    assert changes[0].change_type == ChangeType.UNCERTAIN
    assert changes[0].is_uncertain
    assert changes[0].old_section_label == "Section 10"
    assert changes[0].new_section_label == "Section 22"
    assert 0.40 <= changes[0].similarity_ratio < 0.70

