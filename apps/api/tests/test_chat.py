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
