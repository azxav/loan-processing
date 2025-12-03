from typing import Dict, Any
from ai_agents.orchestrator import orchestrator

class AgentService:
    """
    Service layer for AI agent orchestration.
    Provides interface between backend API and multi-agent system.
    """
    
    async def process_loan_application(
        self,
        application_id: str,
        application_data: Dict[str, Any]
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
        return await orchestrator.process_application(application_id, application_data)
    
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

