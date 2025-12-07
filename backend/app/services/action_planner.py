from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional


DESTRUCTIVE_KEYWORDS = [
    "drop table",
    "truncate",
    "delete all",
    "format disk",
    "shutdown",
    "rm -rf",
    "destroy",
]

ALLOW_ACTIONS = {
    "chat",
    "run_orchestrator",
    "analytics_loans_count",
    "analytics_status_counts",
    "analytics_loans_trend",
    "mongo_get_application",
    "mongo_get_documents",
    "mongo_search_applications",
    "mongo_get_latest_application",
}


def _looks_destructive(prompt: str) -> bool:
    lower = prompt.lower()
    return any(word in lower for word in DESTRUCTIVE_KEYWORDS)


def _detect_action(prompt: str) -> str:
    p = prompt.lower()
    looks_like_app = "application" in p or "applic" in p
    looks_like_loan = "loan" in p
    if any(word in p for word in ("latest", "last", "recent", "most recent")) and looks_like_app:
        return "mongo_get_latest_application"
    if ("search" in p or "find" in p) and (looks_like_app or looks_like_loan):
        return "mongo_search_applications"
    if "document" in p or "documents" in p:
        return "mongo_get_documents"
    if looks_like_app and ("detail" in p or "data" in p or "payload" in p or "record" in p):
        return "mongo_get_application"
    if "orchestrator" in p or "process application" in p or "run agents" in p:
        return "run_orchestrator"
    if "status" in p and ("count" in p or "how many" in p):
        return "analytics_status_counts"
    if "graph" in p or "chart" in p or "trend" in p:
        return "analytics_loans_trend"
    if "loan" in p and ("this month" in p or "count" in p or "how many" in p):
        return "analytics_loans_count"
    return ""


def _default_range(params: Dict[str, Any]) -> Dict[str, Any]:
    """Return sanitized date range not exceeding 365 days."""
    now = datetime.utcnow()
    date_from = params.get("from") or params.get("start") or (now - timedelta(days=30)).isoformat()
    date_to = params.get("to") or params.get("end") or now.isoformat()
    try:
        df = datetime.fromisoformat(str(date_from))
    except Exception:
        df = now - timedelta(days=30)
    try:
        dt = datetime.fromisoformat(str(date_to))
    except Exception:
        dt = now
    if dt < df:
        dt = df
    # clamp to 365 days
    if (dt - df).days > 365:
        df = dt - timedelta(days=365)
    return {"from": df.isoformat(), "to": dt.isoformat()}


def plan_intent(prompt: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Produce a safe plan for the user prompt. Returns structure:
    {
      safe: bool,
      action: str | None,
      steps: List[str],
      params: Dict[str, Any],
      guidance: str
    }
    """
    params = params or {}
    if _looks_destructive(prompt):
        return {
            "safe": False,
            "action": None,
            "steps": [
                "Request denied: destructive intents are blocked.",
                "If you need admin operations, use a controlled maintenance procedure.",
            ],
            "params": {},
            "guidance": "Rejected for safety.",
        }

    action = _detect_action(prompt)
    if not action:
        return {
            "safe": True,
            "action": "chat",
            "steps": [
                "No structured action detected; respond conversationally.",
                "Proceed without orchestrations or analytics unless explicitly requested.",
            ],
            "params": params or {},
            "guidance": "Proceed with general AI response.",
        }

    if action not in ALLOW_ACTIONS:
        return {
            "safe": False,
            "action": None,
            "steps": [
                "Requested action is not in the allowed list.",
                "Allowed: run orchestrator, analytics counts, analytics trends, status breakdown.",
            ],
            "params": {},
            "guidance": "Not in allowlist.",
        }

    planned_params: Dict[str, Any] = {}
    if action.startswith("analytics"):
        planned_params.update(_default_range(params))
        if action == "analytics_status_counts":
            planned_params["group_by"] = "status"
        if action == "analytics_loans_trend":
            planned_params["group_by"] = "day"

    if action == "run_orchestrator":
        if "application_id" in params:
            planned_params["application_id"] = params["application_id"]
        if "payload" in params:
            planned_params["payload"] = params["payload"]

    if action in ("mongo_get_application", "mongo_get_documents"):
        if "application_id" in params:
            planned_params["application_id"] = params["application_id"]
        if "document_type" in params:
            planned_params["document_type"] = params["document_type"]

    if action == "mongo_search_applications":
        planned_params.update(_default_range(params))
        limit_raw = params.get("limit") if params else None
        try:
            limit_val = int(limit_raw) if limit_raw is not None else 50
        except Exception:
            limit_val = 50
        planned_params["limit"] = max(1, min(limit_val, 200))
        if "status" in params:
            planned_params["status"] = params["status"]
        if "customer_id" in params:
            planned_params["customer_id"] = params["customer_id"]
        if "external_application_id" in params:
            planned_params["external_application_id"] = params["external_application_id"]

    steps: List[str] = []
    if action == "run_orchestrator":
        steps = [
            "Validate application_id and payload.",
            "Dispatch orchestrator run with tracking.",
            "Report task status and final decision.",
        ]
    elif action == "mongo_get_application":
        steps = [
            "Validate application_id.",
            "Fetch application record and related documents from MongoDB (read-only).",
            "Return sanitized application data to the requester.",
        ]
    elif action == "mongo_get_documents":
        steps = [
            "Validate application_id.",
            "Fetch documents for the application (optionally filter by document_type).",
            "Return sanitized document metadata and extracted data (read-only).",
        ]
    elif action == "mongo_get_latest_application":
        steps = [
            "Find the most recent application by created_at.",
            "Fetch full application record with documents (read-only).",
            "Return the latest application payload for review.",
        ]
    elif action == "mongo_search_applications":
        steps = [
            "Apply date window and optional filters (status/customer/external_id).",
            "Run a read-only search with a safe result limit.",
            "Return matching applications with ids and key fields.",
        ]
    elif action == "analytics_loans_count":
        steps = [
            "Run parameterized count of loan applications in the date range.",
            "Return total count and the date window used.",
        ]
    elif action == "analytics_status_counts":
        steps = [
            "Aggregate loan applications by status within the date range.",
            "Return counts per status with the date window used.",
        ]
    elif action == "analytics_loans_trend":
        steps = [
            "Aggregate daily loan application counts in the date range.",
            "Return a series suitable for graphing.",
        ]

    return {
        "safe": True,
        "action": action,
        "steps": steps,
        "params": planned_params,
        "guidance": "Proceed with execute to run the plan.",
    }
