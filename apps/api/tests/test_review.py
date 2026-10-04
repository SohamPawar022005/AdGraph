def test_review_queue_lists_only_candidate_rule_versions(client):
    r = client.get("/api/v1/review/queue/rule_version")
    assert r.status_code == 200
    items = r.json()
    assert all(i["verification_status"] == "CANDIDATE" for i in items)
    # demo_apply_reviewer_approvals leaves exactly the two below-threshold MID rules.
    assert len(items) == 2


def test_approve_requires_reviewer_role(client, business_headers):
    queue = client.get("/api/v1/review/queue/rule_version").json()
    target_id = queue[0]["id"]
    r = client.post(
        f"/api/v1/review/rule_version/{target_id}",
        json={"action": "approve", "reason": "should be denied"},
        headers=business_headers,
    )
    assert r.status_code == 403


def test_readonly_cannot_approve(client, readonly_headers):
    queue = client.get("/api/v1/review/queue/rule_version").json()
    target_id = queue[0]["id"]
    r = client.post(
        f"/api/v1/review/rule_version/{target_id}",
        json={"action": "approve", "reason": "should be denied"},
        headers=readonly_headers,
    )
    assert r.status_code == 403


def test_reviewer_can_approve_and_queue_shrinks(client, reviewer_headers):
    queue_before = client.get("/api/v1/review/queue/rule_version").json()
    assert len(queue_before) >= 1
    target_id = queue_before[0]["id"]

    r = client.post(
        f"/api/v1/review/rule_version/{target_id}",
        json={"action": "approve", "reason": "Verified against the Gazette text directly (test)."},
        headers=reviewer_headers,
    )
    assert r.status_code == 200

    queue_after = client.get("/api/v1/review/queue/rule_version").json()
    assert len(queue_after) == len(queue_before) - 1
    assert target_id not in {i["id"] for i in queue_after}


def test_admin_can_also_approve(client, admin_headers):
    queue = client.get("/api/v1/review/queue/rule_version").json()
    assert len(queue) == 1  # the one remaining after the previous test's approval
    target_id = queue[0]["id"]
    r = client.post(
        f"/api/v1/review/rule_version/{target_id}",
        json={"action": "approve", "reason": "ADMIN override, verified."},
        headers=admin_headers,
    )
    assert r.status_code == 200
    assert client.get("/api/v1/review/queue/rule_version").json() == []


def test_unknown_entity_type_is_400(client, reviewer_headers):
    r = client.get("/api/v1/review/queue/not_a_real_entity_type")
    assert r.status_code == 400


def test_human_verification_actions_are_audited(client):
    # The reviewer/admin approvals above (of the two below-threshold MID rules) must
    # leave a real audit trail (actor = the logged-in reviewer's email, not "system"
    # and not silent) -- this is the core safety property from
    # docs/architecture/human-verification.md. Deliberately placed at the end of this
    # file (not test_audit.py) so it runs after the approvals it depends on.
    r = client.get("/api/v1/audit-events", params={"entity_type": "rule_version", "limit": 200})
    events = r.json()
    verified_events = [e for e in events if e["event_type"] == "RULE_VERIFIED"]
    assert len(verified_events) >= 2
    actors = {e["actor"] for e in verified_events}
    assert "reviewer@permitgraph.dev" in actors
    assert "admin@permitgraph.dev" in actors
    for e in verified_events:
        assert e["new_value"]["verification_status"] == "VERIFIED"
        assert e["reason"]  # every promotion must carry a documented reason
