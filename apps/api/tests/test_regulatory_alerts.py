from __future__ import annotations

import pytest


def test_regulatory_sources_registry_and_check(client):
    # 1. Sources list
    resp = client.get("/api/v1/alerts/sources")
    assert resp.status_code == 200
    sources = resp.json()
    assert len(sources) >= 4
    source_ids = [s["id"] for s in sources]
    assert "source-maitri" in source_ids
    assert "source-mpcb" in source_ids

    # 2. Source monitoring check
    check_resp = client.post(
        "/api/v1/alerts/sources/check-now",
        json={"source_id": "source-maitri"},
    )
    assert check_resp.status_code == 200
    results = check_resp.json()
    assert len(results) == 1
    assert results[0]["status"] == "success"
    assert results[0]["fingerprint"]


def test_regulatory_subscriptions_lifecycle(client):
    # Create subscription
    sub_resp = client.post(
        "/api/v1/alerts/subscriptions",
        json={
            "subscription_type": "rule",
            "target_id": "RULE-MAITRI-001",
            "target_label": "Single Window Timelines & Deemed Approval",
            "notification_channels": ["in_app"],
        },
    )
    assert sub_resp.status_code == 200
    sub = sub_resp.json()
    assert sub["target_id"] == "RULE-MAITRI-001"
    sub_id = sub["id"]

    # List subscriptions
    list_resp = client.get("/api/v1/alerts/subscriptions")
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert any(s["id"] == sub_id for s in items)

    # Deactivate subscription
    del_resp = client.delete(f"/api/v1/alerts/subscriptions/{sub_id}")
    assert del_resp.status_code == 200
    assert del_resp.json()["ok"] is True


def test_e2e_regulatory_impact_and_alert_workflow(client, business_headers):
    # 1. Create a business profile
    biz_resp = client.post(
        "/api/v1/businesses",
        json={
            "name": "Mahad Chemical Zone Unit",
            "industry": "chemical_manufacturing",
            "district": "Raigad",
            "employees": 80,
            "investment": 120000000,
            "hazardous_material": True,
        },
        headers=business_headers,
    )
    biz_id = biz_resp.json()["id"]

    # 2. Generate Compliance Checklist
    chk_resp = client.post(
        "/api/v1/checklists/generate",
        json={"business_profile_id": biz_id},
    )
    assert chk_resp.status_code == 200
    checklist = chk_resp.json()
    assert len(checklist["tasks"]) > 0

    # 3. Ingest a Regulatory Change
    analyze_resp = client.post(
        "/api/v1/regulatory-changes/analyze",
        json={
            "old_sections": {"Section 16": "Application processing deadline shall be thirty days."},
            "new_sections": {"Section 16": "Application processing deadline shall be twenty-one days with mandatory joint inspection."},
            "is_synthetic": True,
        },
    )

    assert analyze_resp.status_code == 200
    changes = analyze_resp.json()
    assert len(changes) > 0
    change_id = changes[0]["id"]

    # 4. Trigger Graph Impact and Alerts Dispatch
    trigger_resp = client.post(f"/api/v1/alerts/trigger-impact/{change_id}")
    assert trigger_resp.status_code == 200
    dispatch = trigger_resp.json()
    assert dispatch["change_id"] == change_id

    # 5. Verify alerts were generated
    alerts_resp = client.get("/api/v1/alerts")
    assert alerts_resp.status_code == 200
    alerts = alerts_resp.json()["items"]
    assert len(alerts) > 0

    # 6. Verify that affected checklist task was flagged for review
    updated_chk = client.get(f"/api/v1/checklists/{checklist['id']}").json()
    readiness = updated_chk["readiness_status"]
    # If any task in this checklist was affected, it will be flagged for review
    flagged = [t for t in updated_chk["tasks"] if t["flagged_for_review"]]
    if flagged:
        assert readiness == "needs_verification"
        task_to_resolve = flagged[0]
        assert task_to_resolve["flag_reason"]

        # 7. Resolve review
        res_resp = client.post(
            f"/api/v1/checklists/tasks/{task_to_resolve['id']}/resolve-review",
            json={"resolution_notes": "Reviewed new 21-day timeline; updated internal SOP."},
        )
        assert res_resp.status_code == 200
        resolved_task = res_resp.json()
        assert resolved_task["flagged_for_review"] is False
