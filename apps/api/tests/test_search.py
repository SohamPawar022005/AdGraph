from __future__ import annotations

import pytest
from fastapi.testclient import TestClient


def test_search_suggestions(client: TestClient):
    """Test suggestions endpoint returns bilingual popular queries and filters."""
    r = client.get("/api/v1/search/suggestions")
    assert r.status_code == 200
    data = r.json()
    assert "popular_queries_en" in data
    assert "popular_queries_mr" in data
    assert len(data["popular_queries_en"]) > 0
    assert len(data["popular_queries_mr"]) > 0
    assert "available_filters" in data


def test_empty_search_query(client: TestClient):
    """Empty search should return zero items with execution time."""
    r = client.get("/api/v1/search", params={"q": ""})
    assert r.status_code == 200
    data = r.json()
    assert data["total_matches"] == 0
    assert data["items"] == []


def test_english_full_text_search_act(client: TestClient):
    """Searching for 'MAITRI' should return MAITRI Act, sections, and approvals with citations."""
    r = client.get("/api/v1/search", params={"q": "MAITRI"})
    assert r.status_code == 200
    data = r.json()
    assert data["total_matches"] > 0
    assert data["detected_language"] == "en"

    # Verify at least one Act or Section is matched
    types_found = {item["entity_type"] for item in data["items"]}
    assert "act" in types_found or "section" in types_found or "approval" in types_found

    # Check citation and verification structure
    for item in data["items"]:
        assert "citation" in item
        assert "act_title" in item["citation"]
        assert "official_reference" in item["citation"]
        assert "verification" in item
        assert "status" in item["verification"]
        assert "badge_label" in item["verification"]
        assert "<mark>" in item["matched_text"] or "..." in item["matched_text"]


def test_section_search_with_statutory_number(client: TestClient):
    """Searching for 'Section 16' or 'Section 20' should directly target the statutory provision."""
    r = client.get("/api/v1/search", params={"q": "Section 16"})
    assert r.status_code == 200
    data = r.json()
    assert data["total_matches"] > 0

    sec_items = [i for i in data["items"] if i["entity_type"] == "section"]
    assert len(sec_items) > 0
    # Section 16 deals with rationalization of inspections
    sec_16 = next((s for s in sec_items if "16" in s["title"]), None)
    assert sec_16 is not None
    assert sec_16["citation"]["section_number"] == "16"


def test_marathi_search_inspection_and_sections(client: TestClient):
    """Searching in Marathi 'तपासणी' (inspection) should match Section 16 inspection rationalization."""
    r = client.get("/api/v1/search", params={"q": "तपासणी"})
    assert r.status_code == 200
    data = r.json()
    assert data["detected_language"] in ("mr", "mixed")
    assert data["total_matches"] > 0

    # Ensure results include Marathi title/heading representation
    has_mr_title = any(bool(item.get("title_mr")) for item in data["items"])
    assert has_mr_title is True


def test_marathi_search_single_window_and_permissions(client: TestClient):
    """Searching in Marathi 'एकल खिडकी' (Single Window) should find Single Window Application and MAITRI Act."""
    r = client.get("/api/v1/search", params={"q": "एकल खिडकी"})
    assert r.status_code == 200
    data = r.json()
    assert data["total_matches"] > 0
    item_titles = " ".join([i["title"] for i in data["items"]]).lower()
    assert "maitri" in item_titles or "single window" in item_titles


def test_search_filtering_by_entity_type(client: TestClient):
    """Filter search results strictly by entity_type=approval."""
    r = client.get("/api/v1/search", params={"q": "consent", "entity_types": "approval"})
    assert r.status_code == 200
    data = r.json()
    assert data["total_matches"] > 0
    for item in data["items"]:
        assert item["entity_type"] == "approval"


def test_search_filtering_by_verification_status(client: TestClient):
    """Filter search results by verification_status=CANDIDATE."""
    r = client.get("/api/v1/search", params={"q": "Section", "verification_status": "CANDIDATE"})
    assert r.status_code == 200
    data = r.json()
    for item in data["items"]:
        assert item["verification"]["status"] == "CANDIDATE"


def test_search_source_documents(client: TestClient):
    """Searching for source document keywords should return source_document entities."""
    r = client.get("/api/v1/search", params={"q": "amendment", "entity_types": "source_document"})
    assert r.status_code == 200
    data = r.json()
    for item in data["items"]:
        assert item["entity_type"] == "source_document"
        assert item["citation"]["source_document_id"] is not None
