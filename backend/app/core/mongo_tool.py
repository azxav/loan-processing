from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from pymongo.database import Database

from backend.app.core.mongo_utils import serialize_doc, serialize_many, to_object_id


def _parse_date(value: Any, default: datetime) -> datetime:
    """
    Parse an ISO-like date string, falling back to default on error.
    """
    try:
        return datetime.fromisoformat(str(value))
    except Exception:
        return default


def _clamp_limit(limit: Optional[int], default: int = 50, maximum: int = 200) -> int:
    """
    Clamp a user-supplied limit to a safe range.
    """
    if limit is None:
        return default
    try:
        value = int(limit)
    except (TypeError, ValueError):
        return default
    return max(1, min(value, maximum))


def fetch_application(
    db: Database, application_id: str, include_documents: bool = True
) -> Optional[Dict[str, Any]]:
    """
    Read a single loan application by id, optionally attaching its documents.
    Returns None on invalid id or missing record.
    """
    try:
        oid = to_object_id(application_id)
    except ValueError:
        return None

    app = db.loan_applications.find_one({"_id": oid})
    if not app:
        return None

    app_data = serialize_doc(app)
    if include_documents:
        documents = db.documents.find({"application_id": application_id})
        app_data["documents"] = serialize_many(documents)
    return app_data


def fetch_documents(
    db: Database, application_id: str, document_type: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Read documents for an application, optionally filtered by document_type.
    """
    query: Dict[str, Any] = {"application_id": application_id}
    if document_type:
        query["document_type"] = document_type
    return serialize_many(db.documents.find(query))


def fetch_document_by_id(db: Database, document_id: str) -> Optional[Dict[str, Any]]:
    """
    Read a single document by id.
    """
    try:
        oid = to_object_id(document_id)
    except ValueError:
        return None
    return serialize_doc(db.documents.find_one({"_id": oid}))


def search_applications(
    db: Database,
    *,
    status: Optional[str | List[str]] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    customer_id: Optional[str] = None,
    external_application_id: Optional[str] = None,
    limit: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    Search applications with optional filters. Read-only and clamped to a safe limit.
    """
    now = datetime.utcnow()
    start = _parse_date(date_from, now - timedelta(days=30))
    end = _parse_date(date_to, now)
    if end < start:
        end = start

    query: Dict[str, Any] = {"created_at": {"$gte": start, "$lte": end}}
    if status:
        if isinstance(status, list):
            query["status"] = {"$in": status}
        else:
            query["status"] = status
    if customer_id:
        query["customer_id"] = customer_id
    if external_application_id:
        query["external_application_id"] = external_application_id

    safe_limit = _clamp_limit(limit)
    cursor = db.loan_applications.find(query).sort("created_at", -1).limit(safe_limit)
    return serialize_many(cursor)


def fetch_latest_application(
    db: Database, include_documents: bool = True
) -> Optional[Dict[str, Any]]:
    """
    Fetch the most recently created loan application, optionally with documents.
    Returns None when no applications exist.
    """
    latest = db.loan_applications.find().sort("created_at", -1).limit(1)
    docs = list(latest)
    if not docs:
        return None

    app_data = serialize_doc(docs[0])
    if include_documents:
        documents = db.documents.find({"application_id": app_data.get("id")})
        app_data["documents"] = serialize_many(documents)
    return app_data


def fetch_application_payload(db: Database, application_id: str) -> Optional[Dict[str, Any]]:
    """
    Build a composite payload (application + supporting documents) for agents.
    Mirrors legacy `_load_application_payload` but centralized for reuse.
    """
    application = fetch_application(db, application_id, include_documents=False)
    if not application:
        return None

    payload: Dict[str, Any] = {
        "loan_application": application.get("raw_payload")
        or {k: v for k, v in application.items() if k not in {"id", "_id", "raw_payload"}},
    }

    # Attach typed documents
    for doc in db.documents.find({"application_id": application_id}):
        doc_type = doc.get("document_type")
        data = doc.get("extracted_data") or doc
        if doc_type == "IDENTITY":
            payload["id_document"] = data
        elif doc_type == "INCOME":
            payload["payslip"] = data
        elif doc_type == "BANK_STATEMENT":
            payload["bank_statement"] = data

    return payload
