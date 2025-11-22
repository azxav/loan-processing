from typing import Dict, Any
from ai_agents.orchestrator import orchestrator

class AgentService:
    async def analyze_document(self, document_text: str, document_type: str) -> Dict[str, Any]:
        return await orchestrator.verify_document(document_text, document_type)

    async def evaluate_application(self, application_data: Dict[str, Any]) -> Dict[str, Any]:
        return await orchestrator.evaluate_application(application_data)

agent_service = AgentService()
