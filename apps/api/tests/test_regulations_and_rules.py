def test_list_regulations_contains_all_three_real_acts(client):
    r = client.get("/api/v1/regulations")
    assert r.status_code == 200
    short_codes = {reg["short_code"] for reg in r.json()}
    assert short_codes == {"MAITRI-ACT-2023", "MID-ACT-1961", "KHADI-ACT-1960"}


def test_show_regulation_by_id(client):
    reg = client.get("/api/v1/regulations").json()[0]
    r = client.get(f"/api/v1/regulations/{reg['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == reg["id"]


def test_show_regulation_404(client):
    r = client.get("/api/v1/regulations/does-not-exist")
    assert r.status_code == 404


def test_list_rules_includes_both_candidate_and_verified(client):
    r = client.get("/api/v1/rules")
    assert r.status_code == 200
    statuses = {rule["status"] for rule in r.json()}
    # demo_apply_reviewer_approvals leaves two MID rules below the confidence
    # threshold as CANDIDATE -- both states must be visible via the API (never
    # silently hidden), per the human-verification design.
    assert "verified" in statuses
    assert "candidate" in statuses


def test_every_rule_has_required_source_provenance(client):
    rules = client.get("/api/v1/rules").json()
    assert len(rules) > 0
    for rule in rules:
        assert rule["source_document_id"], f"rule {rule['id']} missing source_document_id"
        assert rule["source_section"], f"rule {rule['id']} missing source_section"


def test_rules_evaluate_against_candidate_village_industry_profile(client):
    body = {
        "business_profile": {
            "industry": "agro_based_village_industry",
            "jurisdiction": "Maharashtra",
            "is_village_industry": True,
            "district": "Nashik",
            "employee_count": 5,
            "investment_amount": 500_000,
            "land_type": "village_industry_area",
        }
    }
    r = client.post("/api/v1/rules/evaluate", json=body)
    assert r.status_code == 200
    body = r.json()
    rule_ids = {p["rule_id"] for p in body["permissions"]}
    assert "RULE-KHADI-002F" in rule_ids
