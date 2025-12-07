import asyncio
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from pymongo.database import Database

from backend.app.core import mongo_tool
from backend.app.core.database import get_db
from backend.app.services.action_planner import ALLOW_ACTIONS, plan_intent
from backend.app.services.agent_service import agent_service


class ChatRequest(BaseModel):
    prompt: str
    context: Optional[Dict[str, Any]] = None


class ActionRequest(BaseModel):
    action: str
    application_id: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    script_name: Optional[str] = None
    params: Optional[Dict[str, Any]] = None


class PlanRequest(BaseModel):
    prompt: str
    params: Optional[Dict[str, Any]] = None


class ExecuteRequest(BaseModel):
    prompt: str
    params: Optional[Dict[str, Any]] = None


router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/chat")
async def chat(req: ChatRequest):
    """
    Simple chat endpoint exposing available actions and context echo.
    Replace implementation with real LLM-backed responses as needed.
    """
    return await agent_service.chat(req.prompt, req.context)


@router.post("/actions")
async def start_action(req: ActionRequest, db: Database = Depends(get_db)):
    """
    Start a legacy action and return a task descriptor.
    Supported actions: run_orchestrator, run_script.
    """
    if req.action == "run_orchestrator":
        if not req.application_id:
            raise HTTPException(status_code=400, detail="application_id is required")

        payload = req.payload or _load_application_payload(req.application_id, db)
        if not payload:
            raise HTTPException(status_code=404, detail="Application data not found")

        return await agent_service.start_orchestration_task(req.application_id, payload)

    if req.action == "run_script":
        script_name = req.script_name or "custom_script"
        return await agent_service.run_script_task(script_name, req.params or {})

    raise HTTPException(status_code=400, detail="Unsupported action")


@router.get("/actions/{task_id}")
async def get_action_status(task_id: str):
    task = await agent_service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("/plan")
async def plan(req: PlanRequest):
    """
    Return a safe plan for the requested action.
    """
    return plan_intent(req.prompt, req.params)


def _match_range(date_from: datetime, date_to: datetime) -> Dict[str, Any]:
    return {"created_at": {"$gte": date_from, "$lte": date_to}}


async def _run_analytics_count(date_from: datetime, date_to: datetime, db: Database) -> Dict[str, Any]:
    def _work():
        return db.loan_applications.count_documents(_match_range(date_from, date_to))

    count = await asyncio.to_thread(_work)
    return {
        "metric": "loan_requests",
        "from": date_from.isoformat(),
        "to": date_to.isoformat(),
        "count": count,
    }


async def _run_analytics_status(date_from: datetime, date_to: datetime, db: Database) -> Dict[str, Any]:
    def _work():
        rows = db.loan_applications.aggregate(
            [
                {"$match": _match_range(date_from, date_to)},
                {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            ]
            )
        return {str(row["_id"]): row["count"] for row in rows}

    counts = await asyncio.to_thread(_work)
    return {
        "metric": "loan_status_counts",
        "from": date_from.isoformat(),
        "to": date_to.isoformat(),
        "counts": counts,
    }


async def _run_analytics_trend(date_from: datetime, date_to: datetime, db: Database) -> Dict[str, Any]:
    def _work():
        rows = db.loan_applications.aggregate(
            [
                {"$match": _match_range(date_from, date_to)},
                {
                    "$group": {
                        "_id": {
                            "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
                        },
                        "count": {"$sum": 1},
                    }
                },
                {"$sort": {"_id": 1}},
            ]
            )
        return [{"day": row["_id"], "count": row["count"]} for row in rows]

    series = await asyncio.to_thread(_work)
    return {
        "metric": "loan_trend",
        "from": date_from.isoformat(),
        "to": date_to.isoformat(),
        "series": series,
    }


async def _run_fetch_application(application_id: str, db: Database) -> Optional[Dict[str, Any]]:
    return await asyncio.to_thread(mongo_tool.fetch_application, db, application_id, True)


async def _run_fetch_documents(application_id: str, db: Database, document_type: Optional[str]) -> Dict[str, Any]:
    documents = await asyncio.to_thread(mongo_tool.fetch_documents, db, application_id, document_type)
    return {"application_id": application_id, "documents": documents}


async def _run_search_applications(params: Dict[str, Any], db: Database) -> Dict[str, Any]:
    results = await asyncio.to_thread(
        mongo_tool.search_applications,
        db,
        status=params.get("status"),
        date_from=params.get("from"),
        date_to=params.get("to"),
        customer_id=params.get("customer_id"),
        external_application_id=params.get("external_application_id"),
        limit=params.get("limit"),
    )
    return {"results": results, "limit": params.get("limit")}


def _parse_dates(params: Dict[str, Any]) -> Dict[str, datetime]:
    now = datetime.utcnow()
    try:
        df = datetime.fromisoformat(str(params.get("from", now.isoformat())))
    except Exception:
        df = now
    try:
        dt = datetime.fromisoformat(str(params.get("to", now.isoformat())))
    except Exception:
        dt = now
    if dt < df:
        dt = df
    return {"date_from": df, "date_to": dt}


def _load_application_payload(application_id: str, db: Database) -> Optional[Dict[str, Any]]:
    return mongo_tool.fetch_application_payload(db, application_id)


@router.post("/execute")
async def execute(req: ExecuteRequest, db: Database = Depends(get_db)):
    """
    Plan + execute a safe action. Re-validates prompt against allowlist before running.
    """
    plan_result = plan_intent(req.prompt, req.params)
    if not plan_result.get("safe") or not plan_result.get("action") in ALLOW_ACTIONS:
        return {"status": "blocked", "plan": plan_result}

    action = plan_result["action"]
    params = {**(req.params or {}), **plan_result.get("params", {})}

    if action == "chat":
        chat_result = await agent_service.chat(req.prompt, params)
        task = await agent_service.create_instant_result(
            "chat", "Chat response", chat_result
        )
        return {"status": "queued", "plan": plan_result, "task": task}

    if action == "run_orchestrator":
        application_id = params.get("application_id")
        payload = params.get("payload")
        if not application_id:
            raise HTTPException(
                status_code=400, detail="application_id is required to run orchestrator"
            )
        if not payload:
            payload = _load_application_payload(application_id, db)
        if not payload:
            raise HTTPException(status_code=404, detail="Application data not found")
        task = await agent_service.start_orchestration_task(application_id, payload)
        return {"status": "queued", "plan": plan_result, "task": task}

    if action == "mongo_get_application":
        application_id = params.get("application_id")
        if not application_id:
            raise HTTPException(status_code=400, detail="application_id is required")

        preview = mongo_tool.fetch_application(db, application_id, include_documents=True)
        if not preview:
            raise HTTPException(status_code=404, detail="Application not found")

        async def runner():
            return preview

        task = await agent_service.create_task(
            "mongo_get_application",
            f"Fetch application {application_id}",
            runner,
        )
        return {"status": "queued", "plan": plan_result, "task": task}

    if action == "mongo_get_documents":
        application_id = params.get("application_id")
        document_type = params.get("document_type")
        if not application_id:
            raise HTTPException(status_code=400, detail="application_id is required")

        async def runner():
            return await _run_fetch_documents(application_id, db, document_type)

        task = await agent_service.create_task(
            "mongo_get_documents",
            f"Fetch documents for application {application_id}",
            runner,
        )
        return {"status": "queued", "plan": plan_result, "task": task}

    if action == "mongo_get_latest_application":
        async def runner():
            latest = mongo_tool.fetch_latest_application(db, include_documents=True)
            if not latest:
                raise HTTPException(status_code=404, detail="No applications found")
            return latest

        task = await agent_service.create_task(
            "mongo_get_latest_application",
            "Fetch most recent application",
            runner,
        )
        return {"status": "queued", "plan": plan_result, "task": task}

    if action == "mongo_search_applications":
        async def runner():
            return await _run_search_applications(params, db)

        task = await agent_service.create_task(
            "mongo_search_applications",
            "Search applications (read-only)",
            runner,
        )
        return {"status": "queued", "plan": plan_result, "task": task}

    # Analytics actions
    dates = _parse_dates(params)
    date_from, date_to = dates["date_from"], dates["date_to"]

    if action == "analytics_loans_count":
        task = await agent_service.create_task(
            "analytics_loans_count",
            "Count loan applications in range",
            lambda: _run_analytics_count(date_from, date_to, db),
        )
        return {"status": "queued", "plan": plan_result, "task": task}

    if action == "analytics_status_counts":
        task = await agent_service.create_task(
            "analytics_status_counts",
            "Aggregate loan applications by status",
            lambda: _run_analytics_status(date_from, date_to, db),
        )
        return {"status": "queued", "plan": plan_result, "task": task}

    if action == "analytics_loans_trend":
        task = await agent_service.create_task(
            "analytics_loans_trend",
            "Aggregate loan applications by day",
            lambda: _run_analytics_trend(date_from, date_to, db),
        )
        return {"status": "queued", "plan": plan_result, "task": task}

    return {"status": "blocked", "plan": plan_result}
