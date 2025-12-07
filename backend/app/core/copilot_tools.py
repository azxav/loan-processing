"""
Tooling layer for the Staff Copilot agent.

Provides a hybrid toolset that reuses existing Mongo read helpers and adds
copilot-specific utilities for analytics, comparisons, notes, and orchestration
handoffs. All functions are async-friendly and safe by default (clamped limits,
non-destructive writes with history tracking).
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Sequence, Tuple

from pymongo.database import Database

from backend.app.core import mongo_tool, mongo_utils
from backend.app.models.models import ApplicationStatus


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #

def _parse_date(value: Optional[str], fallback: datetime) -> datetime:
    try:
        return datetime.fromisoformat(str(value)) if value else fallback
    except Exception:
        return fallback


def _clamp_limit(limit: Optional[int], default: int = 50, maximum: int = 200) -> int:
    if limit is None:
        return default
    try:
        value = int(limit)
    except (TypeError, ValueError):
        return default
    return max(1, min(value, maximum))


def _build_date_window(
    date_from: Optional[str],
    date_to: Optional[str],
    default_days: int = 30,
) -> Tuple[datetime, datetime]:
    now = datetime.utcnow()
    start = _parse_date(date_from, now - timedelta(days=default_days))
    end = _parse_date(date_to, now)
    if end < start:
        end = start
    return start, end


def _normalize_status_list(status: Optional[Sequence[str]]) -> Optional[List[str]]:
    if not status:
        return None
    if isinstance(status, str):
        status_list = [status]
    else:
        status_list = [str(s) for s in status]
    valid = {s.value for s in ApplicationStatus}
    return [s for s in status_list if s in valid] or None


def _safe_sort(field: str, direction: str) -> Tuple[str, int]:
    allowed_fields = {"created_at", "updated_at", "loan_amount", "loan_term_months", "status"}
    allowed_direction = {"asc": 1, "desc": -1}
    sort_field = field if field in allowed_fields else "created_at"
    sort_dir = allowed_direction.get(direction.lower(), -1)
    return sort_field, sort_dir


# --------------------------------------------------------------------------- #
# Core tools
# --------------------------------------------------------------------------- #

async def search_loans_with_filters(
    db: Database,
    *,
    status: Optional[Sequence[str]] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    amount_min: Optional[float] = None,
    amount_max: Optional[float] = None,
    customer_id: Optional[str] = None,
    external_application_id: Optional[str] = None,
    applicant_name: Optional[str] = None,
    limit: Optional[int] = 50,
    sort_by: str = "created_at",
    sort_direction: str = "desc",
) -> Dict[str, Any]:
    """
    Advanced search across loan applications with safe limits and flexible filters.
    """
    start, end = _build_date_window(date_from, date_to, default_days=60)
    safe_limit = _clamp_limit(limit)
    status_list = _normalize_status_list(status)
    sort_field, sort_dir = _safe_sort(sort_by, sort_direction)

    query: Dict[str, Any] = {"created_at": {"$gte": start, "$lte": end}}
    if status_list:
        query["status"] = {"$in": status_list}
    if customer_id:
        query["customer_id"] = customer_id
    if external_application_id:
        query["external_application_id"] = external_application_id
    amount_filter: Dict[str, Any] = {}
    if amount_min is not None:
        amount_filter["$gte"] = amount_min
    if amount_max is not None:
        amount_filter["$lte"] = amount_max
    if amount_filter:
        query["loan_amount"] = amount_filter
    if applicant_name:
        # Best-effort regex match against known name fields in raw payload
        query["$or"] = [
            {"raw_payload.applicant.full_name": {"$regex": applicant_name, "$options": "i"}},
            {"raw_payload.applicant.name": {"$regex": applicant_name, "$options": "i"}},
            {"raw_payload.customer_name": {"$regex": applicant_name, "$options": "i"}},
        ]

    def _run():
        cursor = (
            db.loan_applications.find(query)
            .sort(sort_field, sort_dir)
            .limit(safe_limit)
        )
        return mongo_utils.serialize_many(cursor)

    results = await asyncio.to_thread(_run)
    return {
        "query": {
            "status": status_list,
            "date_from": start.isoformat(),
            "date_to": end.isoformat(),
            "amount_min": amount_min,
            "amount_max": amount_max,
            "customer_id": customer_id,
            "external_application_id": external_application_id,
            "applicant_name": applicant_name,
            "limit": safe_limit,
            "sort_by": sort_field,
            "sort_direction": "asc" if sort_dir == 1 else "desc",
        },
        "count": len(results),
        "results": results,
    }


async def get_application_summary(db: Database, application_id: str) -> Dict[str, Any]:
    """
    Return a concise summary for a single application including documents.
    """
    def _run():
        return mongo_tool.fetch_application(db, application_id, include_documents=True)

    app = await asyncio.to_thread(_run)
    if not app:
        return {"found": False, "application_id": application_id}

    docs = app.get("documents") or []
    doc_types = sorted({d.get("document_type", "UNKNOWN") for d in docs})
    summary = {
        "id": app.get("id") or app.get("_id"),
        "external_application_id": app.get("external_application_id"),
        "customer_id": app.get("customer_id"),
        "status": app.get("status"),
        "loan_amount": app.get("loan_amount"),
        "loan_purpose": app.get("loan_purpose"),
        "loan_term_months": app.get("loan_term_months"),
        "created_at": app.get("created_at"),
        "updated_at": app.get("updated_at"),
        "document_count": len(docs),
        "document_types": doc_types,
    }
    return {"found": True, "summary": summary, "raw": app}


async def get_analytics_report(
    db: Database,
    *,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    group_by: str = "day",
) -> Dict[str, Any]:
    """
    Aggregate analytics: counts by status and trend over time.
    """
    start, end = _build_date_window(date_from, date_to, default_days=30)

    def _run():
        # Status counts
        status_cursor = db.loan_applications.aggregate(
            [
                {"$match": {"created_at": {"$gte": start, "$lte": end}}},
                {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            ]
        )
        status_counts = {row["_id"]: row["count"] for row in status_cursor}

        # Trend
        date_format = "%Y-%m-%d" if group_by == "day" else "%Y-%m"
        trend_cursor = db.loan_applications.aggregate(
            [
                {"$match": {"created_at": {"$gte": start, "$lte": end}}},
                {
                    "$group": {
                        "_id": {"$dateToString": {"format": date_format, "date": "$created_at"}},
                        "count": {"$sum": 1},
                    }
                },
                {"$sort": {"_id": 1}},
            ]
        )
        trend = [{"bucket": row["_id"], "count": row["count"]} for row in trend_cursor]
        total = sum(item["count"] for item in trend)
        return status_counts, trend, total

    status_counts, trend, total = await asyncio.to_thread(_run)
    return {
        "range": {"from": start.isoformat(), "to": end.isoformat()},
        "total": total,
        "status_counts": status_counts,
        "trend": trend,
    }


async def compare_applications(db: Database, application_ids: Sequence[str]) -> Dict[str, Any]:
    """
    Compare a set of applications side-by-side.
    """
    ids = list(dict.fromkeys(application_ids))  # de-duplicate preserving order

    def _run():
        comparisons = []
        for app_id in ids:
            app = mongo_tool.fetch_application(db, app_id, include_documents=True)
            if not app:
                comparisons.append({"application_id": app_id, "found": False})
                continue
            docs = app.get("documents") or []
            comparisons.append(
                {
                    "application_id": app_id,
                    "found": True,
                    "status": app.get("status"),
                    "loan_amount": app.get("loan_amount"),
                    "loan_purpose": app.get("loan_purpose"),
                    "loan_term_months": app.get("loan_term_months"),
                    "created_at": app.get("created_at"),
                    "updated_at": app.get("updated_at"),
                    "document_count": len(docs),
                    "document_types": sorted({d.get("document_type", "UNKNOWN") for d in docs}),
                }
            )
        return comparisons

    results = await asyncio.to_thread(_run)
    return {"count": len(results), "results": results}


async def update_application_status(
    db: Database,
    application_id: str,
    new_status: str,
    *,
    reason: Optional[str] = None,
    actor: str = "copilot",
) -> Dict[str, Any]:
    """
    Safely update application status with history trail.
    """
    valid_statuses = {s.value for s in ApplicationStatus}
    if new_status not in valid_statuses:
        return {"updated": False, "reason": f"Invalid status '{new_status}'", "allowed": sorted(valid_statuses)}

    now = datetime.utcnow()

    def _run():
        app = db.loan_applications.find_one({"_id": mongo_utils.to_object_id(application_id)})
        if not app:
            return None, False
        update_doc = {
            "$set": {"status": new_status, "updated_at": now},
            "$push": {
                "status_history": {
                    "status": new_status,
                    "reason": reason,
                    "actor": actor,
                    "ts": now,
                }
            },
        }
        result = db.loan_applications.update_one({"_id": app["_id"]}, update_doc)
        updated = result.modified_count == 1
        refreshed = db.loan_applications.find_one({"_id": app["_id"]}) if updated else app
        return refreshed, updated

    refreshed, updated = await asyncio.to_thread(_run)
    if refreshed is None:
        return {"updated": False, "reason": "Application not found", "application_id": application_id}

    return {"updated": updated, "application": mongo_utils.serialize_doc(refreshed)}


async def add_application_note(
    db: Database,
    application_id: str,
    note: str,
    *,
    author: str = "copilot",
) -> Dict[str, Any]:
    """
    Append a note to the application's notes array.
    """
    if not note or not note.strip():
        return {"updated": False, "reason": "Note cannot be empty"}

    now = datetime.utcnow()

    def _run():
        result = db.loan_applications.update_one(
            {"_id": mongo_utils.to_object_id(application_id)},
            {
                "$push": {
                    "notes": {
                        "author": author,
                        "note": note.strip(),
                        "created_at": now,
                    }
                },
                "$set": {"updated_at": now},
            },
        )
        if result.matched_count == 0:
            return None
        return db.loan_applications.find_one({"_id": mongo_utils.to_object_id(application_id)})

    refreshed = await asyncio.to_thread(_run)
    if not refreshed:
        return {"updated": False, "reason": "Application not found", "application_id": application_id}
    return {"updated": True, "application": mongo_utils.serialize_doc(refreshed)}


async def assign_reviewer(
    db: Database,
    application_id: str,
    reviewer: str,
    *,
    priority: Optional[str] = None,
    due_at: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Assign an application to a reviewer with optional priority and due date.
    """
    if not reviewer:
        return {"updated": False, "reason": "Reviewer is required"}

    due_dt = _parse_date(due_at, datetime.utcnow()) if due_at else None
    now = datetime.utcnow()

    def _run():
        result = db.loan_applications.update_one(
            {"_id": mongo_utils.to_object_id(application_id)},
            {
                "$set": {
                    "assigned_reviewer": reviewer,
                    "review_priority": priority,
                    "review_due_at": due_dt,
                    "updated_at": now,
                },
                "$push": {
                    "assignment_history": {
                        "reviewer": reviewer,
                        "priority": priority,
                        "due_at": due_dt,
                        "ts": now,
                    }
                },
            },
        )
        if result.matched_count == 0:
            return None
        return db.loan_applications.find_one({"_id": mongo_utils.to_object_id(application_id)})

    refreshed = await asyncio.to_thread(_run)
    if not refreshed:
        return {"updated": False, "reason": "Application not found", "application_id": application_id}
    return {"updated": True, "application": mongo_utils.serialize_doc(refreshed)}


async def get_document_analysis(
    db: Database,
    application_id: str,
    *,
    document_type: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Fetch documents and return lightweight analysis metadata.
    """
    def _run():
        docs = mongo_tool.fetch_documents(db, application_id, document_type)
        return docs

    docs = await asyncio.to_thread(_run)
    if docs is None:
        return {"found": False, "application_id": application_id}

    type_counts: Dict[str, int] = {}
    for doc in docs:
        doc_type = doc.get("document_type", "UNKNOWN")
        type_counts[doc_type] = type_counts.get(doc_type, 0) + 1

    return {
        "found": True,
        "application_id": application_id,
        "documents": docs,
        "document_type_counts": type_counts,
    }


async def trigger_re_evaluation(
    db: Database,
    application_id: str,
    *,
    payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Prepare a re-evaluation by fetching or building an orchestrator payload.
    The caller can hand this payload to the orchestration task runner.
    """
    def _run():
        if payload:
            return payload
        return mongo_tool.fetch_application_payload(db, application_id)

    final_payload = await asyncio.to_thread(_run)
    if not final_payload:
        return {"ready": False, "reason": "Payload not found", "application_id": application_id}

    return {
        "ready": True,
        "application_id": application_id,
        "payload": final_payload,
        "message": "Payload prepared. Call orchestrator to re-run evaluation.",
    }


# --------------------------------------------------------------------------- #
# Tool execution helper
# --------------------------------------------------------------------------- #

async def execute_copilot_tool(
    name: str,
    arguments: Dict[str, Any],
    db: Database,
) -> Any:
    """
    Dispatch a tool call by name. Ensures consistent async handling.
    """
    tool_map = {
        "search_loans_with_filters": search_loans_with_filters,
        "get_application_summary": get_application_summary,
        "get_analytics_report": get_analytics_report,
        "compare_applications": compare_applications,
        "update_application_status": update_application_status,
        "add_application_note": add_application_note,
        "assign_reviewer": assign_reviewer,
        "get_document_analysis": get_document_analysis,
        "trigger_re_evaluation": trigger_re_evaluation,
    }

    if name not in tool_map:
        raise ValueError(f"Unknown copilot tool: {name}")

    fn = tool_map[name]
    return await fn(db=db, **arguments)
