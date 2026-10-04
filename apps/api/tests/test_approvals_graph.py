def test_list_approvals_marks_real_vs_synthetic(client):
    approvals = client.get("/api/v1/approvals").json()
    assert len(approvals) >= 10
    real = [a for a in approvals if not a["is_synthetic"]]
    synthetic = [a for a in approvals if a["is_synthetic"]]
    assert len(real) > 0 and len(synthetic) > 0
    # Real-process approvals must carry provenance back to a source document.
    for a in real:
        assert a["source_document_id"], f"{a['id']} is marked real but has no source document"


def test_approval_not_found(client):
    r = client.get("/api/v1/approvals/does-not-exist")
    assert r.status_code == 404


def test_approval_dependencies(client):
    approvals = client.get("/api/v1/approvals").json()
    target = next(a for a in approvals if a["id"] == "single-window-application")
    r = client.get(f"/api/v1/approvals/{target['id']}/dependencies")
    assert r.status_code == 200
    body = r.json()
    assert body["approval_id"] == "single-window-application"
    assert isinstance(body["downstream_closure"], list)
    assert body["has_cycle_in_full_graph"] is False


def test_approval_graph_is_acyclic_and_well_formed(client):
    r = client.get("/api/v1/approvals/graph")
    assert r.status_code == 200
    graph = r.json()
    assert graph["has_cycle"] is False
    node_ids = {n["id"] for n in graph["nodes"]}
    for edge in graph["edges"]:
        assert edge["source"] in node_ids
        assert edge["target"] in node_ids
