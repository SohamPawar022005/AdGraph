def test_upload_pdf_document(client, tmp_path):
    f = tmp_path / "fee_receipt.pdf"
    f.write_bytes(b"%PDF-1.4 test content for document upload\n%%EOF")
    with f.open("rb") as fh:
        r = client.post(
            "/api/v1/documents/upload",
            files={"file": ("fee_receipt.pdf", fh, "application/pdf")},
            data={"document_type": "processing_fee_receipt"},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["original_filename"] == "fee_receipt.pdf"
    assert len(body["content_hash"]) == 64  # sha256 hex digest
    assert body["validation_status"] == "pending"


def test_upload_rejects_disallowed_extension(client, tmp_path):
    f = tmp_path / "virus.exe"
    f.write_bytes(b"not a real binary, just testing extension rejection")
    with f.open("rb") as fh:
        r = client.post(
            "/api/v1/documents/upload",
            files={"file": ("virus.exe", fh, "application/octet-stream")},
            data={"document_type": "processing_fee_receipt"},
        )
    assert r.status_code == 400


def test_validate_document_with_extracted_fields(client, tmp_path):
    f = tmp_path / "fee_receipt2.pdf"
    f.write_bytes(b"%PDF-1.4 another test document\n%%EOF")
    with f.open("rb") as fh:
        uploaded = client.post(
            "/api/v1/documents/upload",
            files={"file": ("fee_receipt2.pdf", fh, "application/pdf")},
            data={"document_type": "processing_fee_receipt"},
        ).json()

    r = client.post(
        f"/api/v1/documents/{uploaded['id']}/validate",
        json={"amount": "100", "payment_date": "2024-01-01", "application_reference": "APP-TEST-1"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == uploaded["id"]
    assert body["validation_status"] in {"valid", "invalid"}
    assert isinstance(body["validation_errors"], list)


def test_validate_unknown_document_404(client):
    r = client.post("/api/v1/documents/does-not-exist/validate", json={})
    assert r.status_code == 404


def test_list_documents_paginated(client):
    r = client.get("/api/v1/documents", params={"limit": 2})
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 1000  # synthetic dataset loaded 1300 documents
    assert len(body["items"]) == 2
