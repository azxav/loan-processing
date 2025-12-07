import sys
import time
from pathlib import Path
from datetime import datetime

import mongomock
import pytest
from fastapi.testclient import TestClient

# Ensure project root is on sys.path so `backend` can be imported
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.core.database import get_db
from backend.app.main import app
from backend.app.models.models import ApplicationStatus, DocumentType

mock_client = mongomock.MongoClient()
mock_db = mock_client["test_db"]


def override_get_db():
    yield mock_db


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_db():
    mock_db.loan_applications.delete_many({})
    mock_db.documents.delete_many({})


def _seed_application(status: ApplicationStatus = ApplicationStatus.SUBMITTED) -> str:
    created_at = datetime.utcnow()
    app_doc = {
        "customer_id": "TEST-CUST-1",
        "loan_amount": 5000,
        "loan_purpose": "Test Loan",
        "loan_term_months": 12,
        "status": status.value,
        "created_at": created_at,
        "updated_at": None,
    }
    app_id = str(mock_db.loan_applications.insert_one(app_doc).inserted_id)

    mock_db.documents.insert_one(
        {
            "application_id": app_id,
            "document_type": DocumentType.IDENTITY.value,
            "file_path": "uploads/id.png",
            "extracted_data": {"name": "Test User"},
            "is_verified": True,
            "created_at": created_at,
        }
    )
    return app_id


def _wait_for_task(task_id: str, attempts: int = 10):
    last = None
    for _ in range(attempts):
        resp = client.get(f"/api/v1/agent/actions/{task_id}")
        if resp.status_code != 200:
            break
        last = resp.json()
        if last["status"] == "completed":
            break
        time.sleep(0.01)
    return last


def test_create_loan_application():
    response = client.post(
        "/api/v1/loans/",
        json={
            "loan_amount": 5000,
            "loan_purpose": "Test Loan",
            "loan_term_months": 12,
            "customer_id": "TEST-CUST-1",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["loan_amount"] == 5000
    assert data["status"] == "DRAFT"
    assert "id" in data


def test_read_loan_applications():
    # seed one loan
    client.post(
        "/api/v1/loans/",
        json={
            "loan_amount": 5000,
            "loan_purpose": "Test Loan",
            "loan_term_months": 12,
            "customer_id": "TEST-CUST-1",
        },
    )
    response = client.get("/api/v1/loans/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 1


def test_agent_execute_fetch_application():
    app_id = _seed_application()

    response = client.post(
        "/api/v1/agent/execute",
        json={"prompt": "fetch application data", "params": {"application_id": app_id}},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "queued"
    task_id = payload["task"]["id"]

    task = _wait_for_task(task_id)
    assert task is not None
    assert task["status"] == "completed"
    assert task["result"]["id"] == app_id
    assert any(doc["document_type"] == DocumentType.IDENTITY.value for doc in task["result"]["documents"])


def test_agent_execute_search_applications_filters():
    app_submitted = _seed_application(status=ApplicationStatus.SUBMITTED)
    _seed_application(status=ApplicationStatus.REJECTED)

    response = client.post(
        "/api/v1/agent/execute",
        json={
            "prompt": "search applications",
            "params": {"status": [ApplicationStatus.SUBMITTED.value], "limit": 5},
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "queued"
    task_id = payload["task"]["id"]

    task = _wait_for_task(task_id)
    assert task is not None
    assert task["status"] == "completed"
    results = task["result"]["results"]
    assert len(results) == 1
    assert results[0]["id"] == app_submitted
