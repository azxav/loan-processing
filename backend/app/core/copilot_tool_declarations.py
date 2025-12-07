"""
Function declarations for the Staff Copilot Gemini agent.

These declarations mirror the tools implemented in `copilot_tools.py` and are
used when configuring Gemini function calling.
"""

from typing import List, Dict, Any


SEARCH_LOANS_DECLARATION: Dict[str, Any] = {
    "name": "search_loans_with_filters",
    "description": (
        "Search loan applications with flexible filters (status, date range, "
        "amount range, customer, applicant) and safe limits."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "status": {"type": "array", "items": {"type": "string"}},
            "date_from": {"type": "string", "description": "ISO date lower bound"},
            "date_to": {"type": "string", "description": "ISO date upper bound"},
            "amount_min": {"type": "number"},
            "amount_max": {"type": "number"},
            "customer_id": {"type": "string"},
            "external_application_id": {"type": "string"},
            "applicant_name": {"type": "string"},
            "limit": {"type": "integer", "description": "Max results (default 50, capped 200)"},
            "sort_by": {"type": "string", "enum": ["created_at", "updated_at", "loan_amount", "loan_term_months", "status"]},
            "sort_direction": {"type": "string", "enum": ["asc", "desc"]},
        },
    },
}

GET_APPLICATION_SUMMARY_DECLARATION: Dict[str, Any] = {
    "name": "get_application_summary",
    "description": "Fetch a single application with documents and return a concise summary.",
    "parameters": {
        "type": "object",
        "properties": {
            "application_id": {"type": "string"},
        },
        "required": ["application_id"],
    },
}

GET_ANALYTICS_REPORT_DECLARATION: Dict[str, Any] = {
    "name": "get_analytics_report",
    "description": "Aggregate analytics (status counts and trend) for a date window.",
    "parameters": {
        "type": "object",
        "properties": {
            "date_from": {"type": "string"},
            "date_to": {"type": "string"},
            "group_by": {"type": "string", "enum": ["day", "month"]},
        },
    },
}

COMPARE_APPLICATIONS_DECLARATION: Dict[str, Any] = {
    "name": "compare_applications",
    "description": "Compare multiple applications side-by-side.",
    "parameters": {
        "type": "object",
        "properties": {
            "application_ids": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["application_ids"],
    },
}

UPDATE_APPLICATION_STATUS_DECLARATION: Dict[str, Any] = {
    "name": "update_application_status",
    "description": "Update an application's status with history tracking (advanced scope).",
    "parameters": {
        "type": "object",
        "properties": {
            "application_id": {"type": "string"},
            "new_status": {"type": "string"},
            "reason": {"type": "string"},
            "actor": {"type": "string"},
        },
        "required": ["application_id", "new_status"],
    },
}

ADD_APPLICATION_NOTE_DECLARATION: Dict[str, Any] = {
    "name": "add_application_note",
    "description": "Append a note to an application (e.g., reviewer guidance).",
    "parameters": {
        "type": "object",
        "properties": {
            "application_id": {"type": "string"},
            "note": {"type": "string"},
            "author": {"type": "string"},
        },
        "required": ["application_id", "note"],
    },
}

ASSIGN_REVIEWER_DECLARATION: Dict[str, Any] = {
    "name": "assign_reviewer",
    "description": "Assign or reassign an application to a reviewer with optional priority.",
    "parameters": {
        "type": "object",
        "properties": {
            "application_id": {"type": "string"},
            "reviewer": {"type": "string"},
            "priority": {"type": "string"},
            "due_at": {"type": "string"},
        },
        "required": ["application_id", "reviewer"],
    },
}

GET_DOCUMENT_ANALYSIS_DECLARATION: Dict[str, Any] = {
    "name": "get_document_analysis",
    "description": "Fetch documents for an application and return counts/metadata.",
    "parameters": {
        "type": "object",
        "properties": {
            "application_id": {"type": "string"},
            "document_type": {"type": "string"},
        },
        "required": ["application_id"],
    },
}

TRIGGER_RE_EVALUATION_DECLARATION: Dict[str, Any] = {
    "name": "trigger_re_evaluation",
    "description": "Prepare an orchestrator payload for re-evaluation of an application.",
    "parameters": {
        "type": "object",
        "properties": {
            "application_id": {"type": "string"},
        },
        "required": ["application_id"],
    },
}


COPILOT_TOOL_DECLARATIONS: List[Dict[str, Any]] = [
    SEARCH_LOANS_DECLARATION,
    GET_APPLICATION_SUMMARY_DECLARATION,
    GET_ANALYTICS_REPORT_DECLARATION,
    COMPARE_APPLICATIONS_DECLARATION,
    UPDATE_APPLICATION_STATUS_DECLARATION,
    ADD_APPLICATION_NOTE_DECLARATION,
    ASSIGN_REVIEWER_DECLARATION,
    GET_DOCUMENT_ANALYSIS_DECLARATION,
    TRIGGER_RE_EVALUATION_DECLARATION,
]


def get_copilot_tool_declarations() -> List[Dict[str, Any]]:
    return COPILOT_TOOL_DECLARATIONS
