from typing import Dict, Any
from ai_agents.models import get_gemini_model
from ai_agents.prompts import DOCUMENT_VERIFICATION_PROMPT, LOAN_EVALUATION_PROMPT
from ai_agents.tools import AgentTools
import json

class AgentOrchestrator:
    def __init__(self):
        self.model = get_gemini_model()

    async def verify_document(self, document_text: str, document_type: str) -> Dict[str, Any]:
        if not self.model:
            return {"is_valid": True, "issues": ["AI Model not configured"], "extracted_fields": {}}

        prompt = DOCUMENT_VERIFICATION_PROMPT.format(
            document_type=document_type,
            document_text=document_text[:2000] # Truncate for MVP
        )
        
        try:
            response = self.model.generate_content(prompt)
            # Basic parsing, in production use structured output or robust parsing
            text = response.text.replace("```json", "").replace("```", "")
            return json.loads(text)
        except Exception as e:
            print(f"Error in verify_document: {e}")
            return {"is_valid": False, "issues": ["AI processing failed"], "extracted_fields": {}}

    async def evaluate_application(self, application_data: Dict[str, Any]) -> Dict[str, Any]:
        if not self.model:
             return {"decision": "MANUAL_REVIEW", "risk_level": "UNKNOWN", "reason": "AI Model not configured"}

        prompt = LOAN_EVALUATION_PROMPT.format(
            application_data=json.dumps(application_data, default=str)
        )
        
        try:
            response = self.model.generate_content(prompt)
            text = response.text.replace("```json", "").replace("```", "")
            return json.loads(text)
        except Exception as e:
            print(f"Error in evaluate_application: {e}")
            return {"decision": "MANUAL_REVIEW", "risk_level": "UNKNOWN", "reason": "AI processing failed"}

orchestrator = AgentOrchestrator()
