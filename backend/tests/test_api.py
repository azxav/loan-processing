import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker
import pytest

# Ensure project root is on sys.path so `backend` can be imported
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.main import app
from backend.app.core.database import Base, engine, get_db

# Setup test database
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

# Setup test database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_create_loan_application():
    response = client.post(
        "/api/v1/loans/",
        json={
            "loan_amount": 5000,
            "loan_purpose": "Test Loan",
            "loan_term_months": 12,
            "customer_id": 1
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["loan_amount"] == 5000
    assert "id" in data

def test_read_loan_applications():
    response = client.get("/api/v1/loans/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
