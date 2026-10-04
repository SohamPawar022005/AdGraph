def test_list_businesses_paginated(client):
    r = client.get("/api/v1/businesses", params={"limit": 5, "offset": 0})
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 5000  # full synthetic dataset loaded in conftest
    assert len(body["items"]) == 5


def test_create_and_fetch_business(client):
    r = client.post(
        "/api/v1/businesses",
        json={"name": "Test Co", "industry": "food_processing", "district": "Pune", "employees": 10},
    )
    assert r.status_code == 200
    biz = r.json()
    assert biz["is_synthetic"] is True  # default -- CLI/API-created test fixtures are never marked real

    r2 = client.get(f"/api/v1/businesses/{biz['id']}")
    assert r2.status_code == 200
    assert r2.json()["name"] == "Test Co"


def test_business_not_found(client):
    r = client.get("/api/v1/businesses/does-not-exist")
    assert r.status_code == 404


def test_full_application_lifecycle(client):
    biz = client.post(
        "/api/v1/businesses",
        json={"name": "Lifecycle Test Co", "industry": "food_processing"},
    ).json()

    created = client.post(
        "/api/v1/applications",
        json={"business_profile_id": biz["id"], "approval_id": "single-window-application"},
    )
    assert created.status_code == 200
    app = created.json()
    assert app["state"] == "submitted"

    fetched = client.get(f"/api/v1/applications/{app['id']}")
    assert fetched.status_code == 200
    detail = fetched.json()
    assert detail["sla"]["limit_days"] == 21
    assert len(detail["events"]) == 1

    transitioned = client.post(
        f"/api/v1/applications/{app['id']}/transition",
        json={"target_state": "under_review", "actor": "officer@permitgraph.dev"},
    )
    assert transitioned.status_code == 200
    assert transitioned.json()["state"] == "under_review"


def test_invalid_transition_is_rejected(client):
    biz = client.post(
        "/api/v1/businesses", json={"name": "Bad Transition Co", "industry": "food_processing"}
    ).json()
    app = client.post(
        "/api/v1/applications",
        json={"business_profile_id": biz["id"], "approval_id": "single-window-application"},
    ).json()
    # submitted -> approved directly is not a legal workflow transition.
    r = client.post(f"/api/v1/applications/{app['id']}/transition", json={"target_state": "approved"})
    assert r.status_code == 400


def test_list_applications_filter_by_state(client):
    r = client.get("/api/v1/applications", params={"state": "withdrawn", "limit": 3})
    assert r.status_code == 200
    body = r.json()
    assert all(a["state"] == "withdrawn" for a in body["items"])
