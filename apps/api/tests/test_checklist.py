from __future__ import annotations

import pytest
from app.models.business import BusinessProfile
from app.models.checklist import ComplianceChecklist


def test_generate_checklist_from_discovered_permits(client, business_headers):
    # 1. Create a business profile
    biz_resp = client.post(
        "/api/v1/businesses",
        json={
            "name": "Greenfield Agro Chem Facility",
            "industry": "chemical_manufacturing",
            "district": "Pune",
            "location": "Pune MIDC",
            "employees": 120,
            "investment": 85000000,
            "project_stage": "new",
            "land_type": "midc_industrial_area",
            "hazardous_material": True,
            "is_village_industry": False,
        },
        headers=business_headers,
    )
    assert biz_resp.status_code == 200, biz_resp.text
    biz_id = biz_resp.json()["id"]

    # 2. Generate Smart Compliance Checklist
    gen_resp = client.post(
        "/api/v1/checklists/generate",
        json={"business_profile_id": biz_id, "project_name": "Phase 1 Plant"},
    )
    assert gen_resp.status_code == 200, gen_resp.text
    checklist = gen_resp.json()

    assert checklist["business_profile_id"] == biz_id
    assert checklist["project_name"] == "Phase 1 Plant"
    assert len(checklist["tasks"]) > 0

    # Verify tasks have supporting rules and source citations
    for task in checklist["tasks"]:
        assert task["title"]
        assert task["authority_name"]
        assert "prerequisite_approval_ids" in task

    # Verify documents are generated
    assert len(checklist["documents"]) > 0
    mandatory_docs = [d for d in checklist["documents"] if d["is_mandatory"]]
    assert len(mandatory_docs) > 0


def test_task_prerequisite_dependency_handling(client, business_headers):
    biz_resp = client.post(
        "/api/v1/businesses",
        json={
            "name": "Dependency Test Works",
            "industry": "food_processing",
            "district": "Aurangabad",
            "employees": 45,
            "investment": 15000000,
        },
        headers=business_headers,
    )
    biz_id = biz_resp.json()["id"]

    gen_resp = client.post(
        "/api/v1/checklists/generate",
        json={"business_profile_id": biz_id},
    )
    checklist = gen_resp.json()
    tasks = checklist["tasks"]

    # If any task has prerequisites, it should initially be in "blocked" state
    blocked_tasks = [t for t in tasks if t["prerequisite_approval_ids"]]
    if blocked_tasks:
        b_task = blocked_tasks[0]
        assert b_task["status"] == "blocked"
        assert len(b_task["blocking_reasons"]) > 0

        # Now complete the prerequisite tasks
        prereq_ids = set(b_task["prerequisite_approval_ids"])
        for t in tasks:
            if t.get("approval_id") in prereq_ids:
                patch_res = client.patch(
                    f"/api/v1/checklists/tasks/{t['id']}",
                    json={"status": "completed"},
                )
                assert patch_res.status_code == 200

        # Refetch checklist - b_task should no longer be blocked
        updated_chk = client.get(f"/api/v1/checklists/{checklist['id']}").json()
        target = next(t for t in updated_chk["tasks"] if t["id"] == b_task["id"])
        assert target["status"] in ["not_started", "in_progress"]


def test_task_status_persistence_and_due_dates(client):
    chk_list = client.get("/api/v1/checklists").json()
    assert chk_list["total"] > 0
    checklist_id = chk_list["items"][0]["id"]
    task = chk_list["items"][0]["tasks"][0]

    # Update task due date, notes, and reminder days
    update_resp = client.patch(
        f"/api/v1/checklists/tasks/{task['id']}",
        json={
            "status": "in_progress",
            "notes": "Spoke with MPCB regional officer regarding site visit schedule.",
            "due_date": "2026-11-15T00:00:00Z",
            "reminder_days": 5,
        },
    )
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["status"] == "in_progress"
    assert "MPCB regional officer" in updated["notes"]
    assert updated["reminder_days"] == 5


def test_readiness_validation_engine(client, business_headers):
    # Create business profile
    biz_resp = client.post(
        "/api/v1/businesses",
        json={
            "name": "Readiness Test Facility",
            "industry": "engineering_manufacturing",
            "district": "Pune",
            "employees": 30,
            "investment": 20000000,
        },
        headers=business_headers,
    )
    biz_id = biz_resp.json()["id"]

    gen_resp = client.post("/api/v1/checklists/generate", json={"business_profile_id": biz_id})
    checklist = gen_resp.json()

    # Initial readiness should be "action_required" or "needs_verification" because documents are missing
    readiness_resp = client.get(f"/api/v1/checklists/{checklist['id']}/readiness")
    assert readiness_resp.status_code == 200
    report = readiness_resp.json()

    assert report["readiness_status"] in ["action_required", "needs_verification"]
    assert len(report["failed_checks"]) > 0 or len(report["verification_needed"]) > 0
    assert "Never guarantee government approval" in report["disclaimer"]

    # Mark all mandatory documents as collected/verified
    for doc in checklist["documents"]:
        client.patch(
            f"/api/v1/checklists/documents/{doc['id']}",
            json={"status": "collected"},
        )

    # Complete all tasks
    for task in checklist["tasks"]:
        client.patch(
            f"/api/v1/checklists/tasks/{task['id']}",
            json={"status": "completed"},
        )

    # Now readiness should update to "ready_for_review"
    final_readiness = client.get(f"/api/v1/checklists/{checklist['id']}/readiness").json()
    assert final_readiness["readiness_status"] == "ready_for_review"
    assert len(final_readiness["failed_checks"]) == 0
