def test_audit_log_has_events_from_seeding_and_synthetic_load(client):
    r = client.get("/api/v1/audit-events", params={"limit": 10})
    assert r.status_code == 200
    events = r.json()
    assert len(events) == 10
    for e in events:
        assert e["event_type"]
        assert e["entity_type"]
        assert e["actor"]


def test_audit_log_filter_by_entity_type(client):
    r = client.get("/api/v1/audit-events", params={"entity_type": "rule_version", "limit": 50})
    assert r.status_code == 200
    events = r.json()
    assert len(events) >= 1
    assert all(e["entity_type"] == "rule_version" for e in events)


# The "human verification actions are audited" assertion lives at the end of
# test_review.py (not here) so it runs *after* that file's approve/reject tests --
# pytest executes tests within a module in definition order, and test_audit.py would
# otherwise run alphabetically before test_review.py, seeing an empty audit trail.
