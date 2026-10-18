"""Shared pytest fixtures for the PermitGraph API test suite.

The fixture database is built by running the *real* seed scripts
(scripts/seed_real_corpus.py + scripts/demo_apply_reviewer_approvals.py) against an
isolated, per-session SQLite file -- not a hand-rolled duplicate of the seeding logic.
This means these tests also double as regression tests for the seed scripts
themselves, and the CANDIDATE -> VERIFIED promotion path always goes through the real
`verification_service.review_entity` function, never a direct DB write.
"""
from __future__ import annotations

import os
import pathlib
import sys

import pytest

REPO_ROOT = pathlib.Path(__file__).resolve().parents[3]
API_ROOT = REPO_ROOT / "apps" / "api"
TEST_DB_PATH = API_ROOT / ".pytest_test.db"

# Must happen before anything imports app.db (which binds the SQLAlchemy engine at
# import time from these env vars).
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ["PERMITGRAPH_SECRET_KEY"] = "test-only-secret-never-use-in-production"
os.environ["PERMITGRAPH_ENV"] = "test"
os.environ.setdefault("LOCAL_STORAGE_DIR", str(API_ROOT / ".pytest_uploads"))

if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))
if str(REPO_ROOT / "scripts") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "scripts"))

DEMO_PASSWORD = "permitgraph-dev-only"


@pytest.fixture(scope="session", autouse=True)
def _seed_database():
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()

    import seed_real_corpus
    import demo_apply_reviewer_approvals
    import load_synthetic_dataset

    seed_real_corpus.main()
    demo_apply_reviewer_approvals.main()
    # Loads the full pre-generated synthetic dataset (~5k businesses/applications) --
    # takes ~15-20s but runs once per test session (session-scoped fixture), and
    # exercises the real document/change/impact service layer at realistic volume
    # rather than a hand-trimmed fixture.
    load_synthetic_dataset.main()

    yield

    try:
        from app.db import engine
        engine.dispose()
    except Exception:
        pass

    try:
        TEST_DB_PATH.unlink(missing_ok=True)
    except PermissionError:
        pass


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def login(client):
    """Returns a function(email) -> Authorization header dict, using the real
    /api/v1/auth/login endpoint (never a hand-crafted JWT)."""

    def _login(email: str) -> dict:
        r = client.post("/api/v1/auth/login", json={"email": email, "password": DEMO_PASSWORD})
        assert r.status_code == 200, r.text
        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    return _login


@pytest.fixture(scope="session")
def reviewer_headers(login):
    return login("reviewer@permitgraph.dev")


@pytest.fixture(scope="session")
def admin_headers(login):
    return login("admin@permitgraph.dev")


@pytest.fixture(scope="session")
def business_headers(login):
    return login("business@permitgraph.dev")


@pytest.fixture(scope="session")
def officer_headers(login):
    return login("officer@permitgraph.dev")


@pytest.fixture(scope="session")
def readonly_headers(login):
    return login("readonly@permitgraph.dev")
