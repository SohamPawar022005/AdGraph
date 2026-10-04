def test_analyze_detects_deadline_change(client):
    r = client.post(
        "/api/v1/regulatory-changes/analyze",
        json={
            "old_sections": {"Section 99": "The authority shall act within 30 days."},
            "new_sections": {"Section 99": "The authority shall act within 15 days."},
            "is_synthetic": True,
        },
    )
    assert r.status_code == 200
    changes = r.json()
    assert len(changes) >= 1
    change = changes[0]
    assert change["change_type"] == "deadline_change"
    assert change["verification_status"] == "CANDIDATE"  # AI-detected change, never auto-VERIFIED
    assert change["is_synthetic"] is True


def test_list_and_get_change(client):
    changes = client.get("/api/v1/regulatory-changes").json()
    assert len(changes) >= 1
    r = client.get(f"/api/v1/regulatory-changes/{changes[0]['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == changes[0]["id"]


def test_change_not_found(client):
    r = client.get("/api/v1/regulatory-changes/does-not-exist")
    assert r.status_code == 404


def test_impact_analysis_for_a_change(client):
    analyzed = client.post(
        "/api/v1/regulatory-changes/analyze",
        json={
            "old_sections": {"Section 16": "Joint inspection shall occur within 7 days."},
            "new_sections": {"Section 16": "Joint inspection shall occur within 10 days."},
            "is_synthetic": True,
        },
    ).json()
    change_id = analyzed[0]["id"]

    r = client.get(f"/api/v1/impact/{change_id}")
    assert r.status_code == 200
    body = r.json()
    assert body["regulatory_change_id"] == change_id
    assert "disclaimer" in body and body["disclaimer"]
    assert isinstance(body["directly_affected_approvals"], list)


def test_impact_for_unknown_change_404(client):
    r = client.get("/api/v1/impact/does-not-exist")
    assert r.status_code == 404
