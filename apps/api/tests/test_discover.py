def test_discover_returns_matching_permissions_with_provenance(client):
    r = client.post(
        "/api/v1/permissions/discover",
        json={
            "industry": "food_processing",
            "district": "Pune",
            "employees": 80,
            "investment": 50_000_000,
            "land_type": "midc_industrial_area",
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert len(body["permissions"]) >= 1
    for perm in body["permissions"]:
        assert perm["source"]["document"]
    assert "NOT a legal determination" in body["disclaimer"]
    assert isinstance(body["dependencies"], list)


def test_discover_insufficient_input_has_documented_shape(client):
    """Regression test: rules_service.discover()'s insufficient_input is a list of
    {rule_id, rule_name, reasons} objects, not bare strings -- a real bug (caught via
    manual CLI testing) had both the CLI and the web frontend assuming string[]."""
    r = client.post("/api/v1/permissions/discover", json={"industry": "food_processing"})
    assert r.status_code == 200
    body = r.json()
    for item in body["insufficient_input"]:
        assert set(item.keys()) >= {"rule_id", "rule_name", "reasons"}
        assert isinstance(item["reasons"], list)


def test_discover_village_industry_profile(client):
    r = client.post(
        "/api/v1/permissions/discover",
        json={
            "industry": "agro_based_village_industry",
            "district": "Nashik",
            "employees": 5,
            "investment": 500_000,
            "land_type": "village_industry_area",
            "is_village_industry": True,
        },
    )
    assert r.status_code == 200
    rule_ids = {p["rule_id"] for p in r.json()["permissions"]}
    assert "RULE-KHADI-002F" in rule_ids
