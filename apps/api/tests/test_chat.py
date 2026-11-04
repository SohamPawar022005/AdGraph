from fastapi.testclient import TestClient
from apps.api.app.main import app

client = TestClient(app)


def test_chat_endpoint_schema():
    response = client.post(
        "/api/v1/chat",
        json={"message": "What is the procedure for Single Window System Application under MAITRI Act 2023?"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert "provider" in data
    assert "model" in data
    assert "citations" in data
    assert "suggestions" in data
    assert len(data["reply"]) > 0
    assert len(data["suggestions"]) > 0


def test_chat_marathi_language():
    response = client.post(
        "/api/v1/chat",
        json={
            "message": "कारखाना परवान्यासाठी कोणती कागदपत्रे लागतात?",
            "language": "mr",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "reply" in data
    assert len(data["reply"]) > 0


def test_calculate_statutory_fees():
    response = client.post(
        "/api/v1/chat/calculate-fees",
        json={
            "investment_cr": 25.0,
            "category": "Orange",
            "location": "MIDC",
            "workers_count": 80,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_statutory_fees"] > 0
    assert data["days_saved"] == 60
    assert len(data["fee_breakdown"]) == 6


def test_audit_document_compliance():
    # Non-compliant document text (30-day inspection period)
    non_compliant_text = "The inspection shall be conducted within 30 days of submission."
    response = client.post(
        "/api/v1/chat/audit-document",
        json={"document_text": non_compliant_text},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("AMENDMENT_REQUIRED", "NON_COMPLIANT")
    assert any(f["severity"] == "CRITICAL" for f in data["findings"])


def test_hotel_raid_multi_turn_context():
    t1_response = client.post(
        '/api/v1/chat',
        json={'message': 'tukaram munde just raided my hotel, what should i do ?'},
    )
    assert t1_response.status_code == 200
    t1_data = t1_response.json()
    t1_reply = t1_data['reply'].lower()
    assert any(term in t1_reply for term in ['inspection', 'fssai', 'food', 'panchnama', 'officer', 'authorization'])
    assert 'midc industrial plot allotment' not in t1_reply

    t2_response = client.post(
        '/api/v1/chat',
        json={
            'message': 'what should I keep ready to present him ?',
            'history': [
                {'role': 'user', 'content': 'tukaram munde just raided my hotel, what should i do ?'},
                {'role': 'assistant', 'content': t1_data['reply']},
            ],
        },
    )
    assert t2_response.status_code == 200
    t2_data = t2_response.json()
    t2_reply = t2_data['reply'].lower()
    assert any(term in t2_reply for term in ['fssai', 'water', 'potability', 'fire', 'panchnama', 'medical', 'trade license'])
    assert 'midc industrial plot allotment' not in t2_reply
