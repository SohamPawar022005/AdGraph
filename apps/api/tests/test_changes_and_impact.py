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


def test_impact_export_json_and_evidence_paths(client):
    analyzed = client.post(
        "/api/v1/regulatory-changes/analyze",
        json={
            "old_sections": {"Section 16": "Inspection within 7 days."},
            "new_sections": {"Section 16": "Inspection within 14 days."},
            "is_synthetic": True,
        },
    ).json()
    change_id = analyzed[0]["id"]

    r = client.get(f"/api/v1/impact/{change_id}")
    assert r.status_code == 200
    impact = r.json()
    assert "evidence_paths" in impact
    assert "relationship_tiers" in impact

    # Test export
    exp = client.get(f"/api/v1/impact/{change_id}/export")
    assert exp.status_code == 200
    data = exp.json()
    assert data["report_version"] == "1.0.0"
    assert data["change"]["id"] == change_id
    assert "evidence_paths" in data["impact"]


def test_source_document_upload_and_compare(client):
    from app.db import SessionLocal
    from app.models import (
        SourceDocument,
        Regulation,
        RegulationVersion,
        Section,
        Rule,
        RuleVersion,
        RegulatoryChange,
        ImpactAssessment,
    )

    doc_id_1 = None
    doc_id_2 = None
    change_ids = []

    try:
        # Test upload of a regulatory text document
        doc_text = """1. Short title.— This Act may be called the Maharashtra Innovation Act.
2. Nodal Agency.— The Directorate of Industries shall be the Nodal Agency.
16. Inspections.— Joint inspections shall be conducted within 30 days.
"""
        res = client.post(
            "/api/v1/regulations/source-documents/upload",
            data={
                "title": "Maharashtra Innovation Act",
                "jurisdiction": "Maharashtra",
                "document_type": "Act",
                "version_label": "2024",
            },
            files={"file": ("innovation_act.txt", doc_text.encode("utf-8"), "text/plain")},
        )
        assert res.status_code == 200
        doc_data = res.json()
        assert doc_data["title"] == "Maharashtra Innovation Act"
        assert doc_data["sections_extracted"] >= 3
        doc_id_1 = doc_data["id"]

        # Upload amended version
        doc_text_v2 = """1. Short title.— This Act may be called the Maharashtra Innovation Act.
2. Nodal Agency.— The Maharashtra Innovation Council shall be the Nodal Agency.
16. Inspections.— Joint inspections shall be conducted within 15 days.
"""
        res2 = client.post(
            "/api/v1/regulations/source-documents/upload",
            data={
                "title": "Maharashtra Innovation Act Amendment",
                "jurisdiction": "Maharashtra",
                "document_type": "Amendment",
                "version_label": "2025",
            },
            files={"file": ("innovation_act_v2.txt", doc_text_v2.encode("utf-8"), "text/plain")},
        )
        assert res2.status_code == 200
        doc_id_2 = res2.json()["id"]

        # Test comparison of the two uploaded source documents
        comp = client.post(
            "/api/v1/regulations/compare-source-documents",
            json={"old_document_id": doc_id_1, "new_document_id": doc_id_2, "is_synthetic": True},
        )
        assert comp.status_code == 200
        changes = comp.json()
        assert len(changes) >= 1
        change_ids = [c["id"] for c in changes]
        types = {c["change_type"] for c in changes}
        assert "deadline_change" in types or "authority_change" in types or "modification" in types

        # Test detail fetching
        detail = client.get(f"/api/v1/regulations/source-documents/{doc_id_1}")
        assert detail.status_code == 200
        assert len(detail.json()["sections"]) >= 3
    finally:
        with SessionLocal() as db:
            for cid in change_ids:
                db.query(ImpactAssessment).filter(ImpactAssessment.regulatory_change_id == cid).delete(synchronize_session=False)
                db.query(RegulatoryChange).filter(RegulatoryChange.id == cid).delete(synchronize_session=False)

            for did in [doc_id_1, doc_id_2]:
                if not did:
                    continue
                rvs = db.query(RuleVersion).filter(RuleVersion.source_document_id == did).all()
                for rv in rvs:
                    rule_id = rv.rule_id
                    db.delete(rv)
                    db.flush()
                    if db.query(RuleVersion).filter(RuleVersion.rule_id == rule_id).count() == 0:
                        db.query(Rule).filter(Rule.id == rule_id).delete(synchronize_session=False)

                db.query(Section).filter(Section.source_document_id == did).delete(synchronize_session=False)

                reg_vers = db.query(RegulationVersion).filter(RegulationVersion.source_document_id == did).all()
                for rv in reg_vers:
                    reg_id = rv.regulation_id
                    db.delete(rv)
                    db.flush()
                    if db.query(RegulationVersion).filter(RegulationVersion.regulation_id == reg_id).count() == 0:
                        db.query(Regulation).filter(Regulation.id == reg_id).delete(synchronize_session=False)

                db.query(SourceDocument).filter(SourceDocument.id == did).delete(synchronize_session=False)

            lingering_regs = db.query(Regulation).filter(Regulation.short_code.like("MAHARASHTRA-INNOVATI%")).all()
            for lr in lingering_regs:
                db.delete(lr)

            db.commit()


def test_reviewer_can_edit_candidate_change(client):
    from app.db import SessionLocal
    from app.models import RegulatoryChange, ImpactAssessment, AuditEvent

    DEMO_PASSWORD = "permitgraph-dev-only"

    # Get reviewer auth token
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "reviewer@permitgraph.dev", "password": DEMO_PASSWORD},
    ).json()
    token = login["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    change_id = None
    try:
        # Create a change to edit
        analyzed = client.post(
            "/api/v1/regulatory-changes/analyze",
            json={
                "old_sections": {"Section 5": "Old fee was 500."},
                "new_sections": {"Section 5": "New fee is 1000."},
                "is_synthetic": True,
            },
        ).json()
        change_id = analyzed[0]["id"]

        # Edit the candidate change with updated summary
        edit_res = client.post(
            f"/api/v1/review/regulatory_change/{change_id}",
            json={
                "action": "edit",
                "reason": "Clarified fee structure applicability for industrial units",
                "updates": {"summary": "Updated statutory fee from 500 to 1000 for manufacturing units"},
            },
            headers=headers,
        )
        assert edit_res.status_code == 200
        body = edit_res.json()
        assert body["action"] == "edit"
        assert body["new_status"] == "CANDIDATE"

        # Verify the edit persisted
        ch = client.get(f"/api/v1/regulatory-changes/{change_id}").json()
        assert "manufacturing units" in ch["summary"]
    finally:
        if change_id:
            with SessionLocal() as db:
                db.query(ImpactAssessment).filter(ImpactAssessment.regulatory_change_id == change_id).delete(synchronize_session=False)
                db.query(RegulatoryChange).filter(RegulatoryChange.id == change_id).delete(synchronize_session=False)
                db.query(AuditEvent).filter(AuditEvent.entity_id == change_id).delete(synchronize_session=False)
                db.commit()


