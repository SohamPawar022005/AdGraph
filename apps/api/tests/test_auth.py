from .conftest import DEMO_PASSWORD


def test_login_success(client):
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "reviewer@permitgraph.dev", "password": DEMO_PASSWORD},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["role"] == "REGULATORY_REVIEWER"
    assert body["token_type"] == "bearer"
    assert len(body["access_token"]) > 20


def test_login_wrong_password(client):
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "reviewer@permitgraph.dev", "password": "wrong-password"},
    )
    assert r.status_code == 401


def test_login_unknown_user(client):
    r = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@permitgraph.dev", "password": DEMO_PASSWORD},
    )
    assert r.status_code == 401


def test_role_gated_endpoint_without_token_is_401(client):
    # /api/v1/review/* is the one role-gated surface in this MVP (see
    # apps/api/app/routers/review.py) -- catalogue/read endpoints (regulations,
    # rules, approvals, audit-events, ...) are intentionally open-read in this
    # prototype; only the human-verification write actions are access-controlled.
    r = client.post("/api/v1/review/rule_version/does-not-matter", json={"action": "approve"})
    assert r.status_code == 401


def test_role_gated_endpoint_with_garbage_token_is_401(client):
    r = client.post(
        "/api/v1/review/rule_version/does-not-matter",
        json={"action": "approve"},
        headers={"Authorization": "Bearer not-a-real-token"},
    )
    assert r.status_code == 401
