from typing import Dict, Any, Callable, Awaitable, Optional
from ai_agents.orchestrator import orchestrator
import uuid
import asyncio
from datetime import datetime

WORKFLOW_NODES = [
    "start",
    "doc-processing",
    "doc-verification",
    "doc-check",
    "reject-high-risk",
    "credit-scoring",
    "parallel-split",
    "income-analysis",
    "debt-assessment",
    "compliance-check",
    "report-generation",
    "routing-decision",
    "auto-approve",
    "manual-review",
    "auto-reject",
    "final-decision",
    "update-banking",
    "disburse",
    "notify",
    "end",
]

def _default_status_map() -> Dict[str, str]:
    return {node: ("completed" if node == "start" else "pending") for node in WORKFLOW_NODES}


class AgentService:
    """
    Service layer for AI agent orchestration.
    Provides interface between backend API and multi-agent system.
    Includes lightweight task tracking for long-running actions.
    """

    def __init__(self) -> None:
        self.tasks: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def _update_task(self, task_id: str, **updates: Any) -> None:
        async with self._lock:
            task = self.tasks.get(task_id)
            if not task:
                return
            task.update(updates)
            task["updated_at"] = datetime.utcnow().isoformat()

    async def _append_message(self, task_id: str, message: Dict[str, Any]) -> None:
        async with self._lock:
            task = self.tasks.get(task_id)
            if not task:
                return
            task.setdefault("messages", []).append(message)
            task["updated_at"] = datetime.utcnow().isoformat()

    async def _apply_progress_event(
        self,
        task_id: str,
        *,
        step: Optional[str] = None,
        status: Optional[str] = None,
        message: Optional[str] = None,
        progress: Optional[float] = None,
        decision: Optional[str] = None,
    ) -> None:
        ts = datetime.utcnow().isoformat()
        async with self._lock:
            task = self.tasks.get(task_id)
            if not task:
                return
            status_map = task.setdefault("status_map", _default_status_map())
            if step:
                if status:
                    status_map[step] = status
                task["active_step"] = step
            if decision:
                task["decision"] = decision
            if progress is not None:
                task["progress"] = progress
            if message:
                task.setdefault("messages", []).append(
                    {
                        "ts": ts,
                        "step": step,
                        "status": status,
                        "text": message,
                        "progress": progress,
                    }
                )
            task["updated_at"] = ts

    async def _create_task(
        self,
        action: str,
        description: str,
        runner: Callable[[], Awaitable[Any]],
        task_id_ref: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        task_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        task_state = {
            "id": task_id,
            "action": action,
            "description": description,
            "status": "queued",
            "progress": 0.0,
            "messages": [],
            "result": None,
            "error": None,
            "status_map": _default_status_map(),
            "active_step": None,
            "decision": None,
            "created_at": now,
            "updated_at": now,
        }
        if task_id_ref is not None:
            task_id_ref["id"] = task_id
        async with self._lock:
            self.tasks[task_id] = task_state

        async def _runner():
            await self._update_task(task_id, status="running", progress=0.05)
            try:
                result = await runner()
                await self._update_task(task_id, status="completed", progress=1.0, result=result)
            except Exception as exc:  # pragma: no cover - defensive
                await self._update_task(task_id, status="failed", error=str(exc), progress=1.0)

        asyncio.create_task(_runner())
        return task_state

    async def create_task(self, action: str, description: str, runner: Callable[[], Awaitable[Any]]) -> Dict[str, Any]:
        """
        Public helper to enqueue an async task with tracking.
        """
        return await self._create_task(action, description, runner)

    async def create_instant_result(self, action: str, description: str, result: Any) -> Dict[str, Any]:
        """
        Store a completed task result without background execution.
        Useful for lightweight or synchronous outcomes.
        """
        task_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        task_state = {
            "id": task_id,
            "action": action,
            "description": description,
            "status": "completed",
            "progress": 1.0,
            "messages": [],
            "result": result,
            "error": None,
            "created_at": now,
            "updated_at": now,
        }
        async with self._lock:
            self.tasks[task_id] = task_state
        return task_state

    async def process_loan_application(
        self,
        application_id: str,
        application_data: Dict[str, Any],
        progress_cb: Optional[Callable[[Dict[str, Any]], Awaitable[None]]] = None,
    ) -> Dict[str, Any]:
        """
        Process complete loan application through multi-agent workflow.

        Args:
            application_id: Unique application identifier
            application_data: Dict containing all documents and data:
                - id_document: From OCR processing of national ID
                - loan_application: Application form data
                - payslip: Payslip document data
                - bank_statement: Bank statement with transactions
                - credit_score: (optional) Pre-calculated score

        Returns:
            Dict with comprehensive results and routing decision
        """
        return await orchestrator.process_application(application_id, application_data, progress_cb)

    async def chat(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Lightweight placeholder chat that surfaces available actions.
        This can be swapped for a real LLM-backed response later.
        """
        return {
            "reply": (
                "I can run orchestrator tasks, execute scripts, fetch loan data from MongoDB (read-only), "
                "and report progress."
            ),
            "actions": [
                {"label": "Run loan orchestration", "action": "run_orchestrator"},
                {"label": "Run script", "action": "run_script"},
                {"label": "Check task status", "action": "check_status"},
                {"label": "Fetch application data", "action": "mongo_get_application"},
                {"label": "Fetch documents", "action": "mongo_get_documents"},
                {"label": "Search applications", "action": "mongo_search_applications"},
            ],
            "context_echo": context or {},
            "prompt": prompt,
        }

    async def start_orchestration_task(
        self,
        application_id: str,
        application_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Kick off orchestrator asynchronously and return task metadata.
        """

        task_ref: Dict[str, str] = {}

        async def runner():
            task_id = task_ref.get("id")
            async def progress_cb(event: Dict[str, Any]):
                if not task_id:
                    return
                await self._apply_progress_event(
                    task_id,
                    step=event.get("step"),
                    status=event.get("status"),
                    message=event.get("message"),
                    progress=event.get("progress"),
                    decision=event.get("decision"),
                )

            result = await self.process_loan_application(application_id, application_data, progress_cb)
            if task_id:
                await self._apply_progress_event(
                    task_id,
                    step="end",
                    status="completed",
                    message="Processing completed",
                    progress=1.0,
                    decision=result.get("routing_action") if isinstance(result, dict) else None,
                )
            return result

        return await self._create_task(
            action="run_orchestrator",
            description=f"Run orchestrator for application {application_id}",
            runner=runner,
            task_id_ref=task_ref,
        )

    async def run_script_task(self, script_name: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Simulate running an internal script; replace with real scripts as needed.
        """

        async def runner():
            await asyncio.sleep(0.5)
            return {
                "script": script_name,
                "params": params or {},
                "status": "completed",
                "message": f"Script {script_name} executed",
            }

        return await self._create_task(
            action="run_script",
            description=f"Execute script {script_name}",
            runner=runner,
        )

    async def get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            return self.tasks.get(task_id)

    # Backward compatibility methods (deprecated)
    async def analyze_document(self, document_text: str, document_type: str) -> Dict[str, Any]:
        """
        Legacy method for backward compatibility.
        Use process_loan_application() instead.
        """
        # Simple wrapper that returns minimal response
        return {
            "status": "DEPRECATED",
            "message": "Use process_loan_application() for full multi-agent processing"
        }

    async def evaluate_application(self, application_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Legacy method for backward compatibility.
        Use process_loan_application() instead.
        """
        return {
            "status": "DEPRECATED",
            "message": "Use process_loan_application() for full multi-agent processing"
        }

agent_service = AgentService()

