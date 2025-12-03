import os
import sys
from pathlib import Path

import pytest
import asyncio

# Ensure project root is on sys.path so `ai_agents` and `backend` can be imported
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai_agents.orchestrator import orchestrator

@pytest.mark.asyncio
async def test_verify_document_mock():
    # Since we don't have a real API key in tests usually, we expect the graceful failure or mock response
    result = await orchestrator.verify_document("Sample text", "IDENTITY")
    assert "is_valid" in result
    assert "issues" in result

@pytest.mark.asyncio
async def test_evaluate_application_mock():
    app_data = {
        "loan_amount": 10000,
        "credit_score": 700,
        "monthly_income": 5000,
        "total_debt": 1000
    }
    result = await orchestrator.evaluate_application(app_data)
    assert "decision" in result
    assert "risk_level" in result
