import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert "service" in response.json()

def test_get_project_not_found():
    response = client.get("/api/project/nonexistent-id")
    assert response.status_code == 404
    assert response.json()["detail"] == "Project not found"

def test_get_pricing_not_found():
    response = client.get("/api/pricing/nonexistent-id")
    assert response.status_code == 404
    assert response.json()["detail"] == "Project not found"
