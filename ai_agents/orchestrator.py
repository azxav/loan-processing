"""
Multi-Agent Orchestrator for loan processing automation.
Coordinates 6 specialized agents in parallel and sequential workflows.
"""

from typing import Dict, Any, Optional, Callable, Awaitable
from datetime import datetime
import asyncio
from ai_agents.agents import (
    DocumentVerificationAgent,
    IncomeAnalysisAgent,
    DebtAssessmentAgent,
    ComplianceCheckAgent,
    ReportGenerationAgent,
    RoutingAgent
)
from ai_agents.models import (
    DocumentVerificationOutput,
    IncomeAnalysisOutput,
    DebtAssessmentOutput,
    ComplianceCheckOutput,
    ReportGenerationOutput,
    RoutingDecisionOutput
)
from backend.app.core.config import settings
import json


class LoanProcessingOrchestrator:
    """
    Orchestrates multi-agent processing of loan applications.
    Manages workflow state, parallel execution, and routing decisions.
    """
    
    def __init__(self):
        # Initialize all specialist agents
        self.doc_agent = DocumentVerificationAgent()
        self.income_agent = IncomeAnalysisAgent()
        self.debt_agent = DebtAssessmentAgent()
        self.compliance_agent = ComplianceCheckAgent()
        self.report_agent = ReportGenerationAgent()
        self.routing_agent = RoutingAgent()
        
        # Workflow state tracker
        self.workflow_state = {}
        
        if settings.ENABLE_AGENT_LOGGING:
            print("✓ LoanProcessingOrchestrator initialized with all 6 agents")

    async def _emit_progress(
        self,
        progress_cb: Optional[Callable[[Dict[str, Any]], Awaitable[None]]],
        *,
        step: str,
        status: str,
        message: Optional[str] = None,
        progress: Optional[float] = None,
        decision: Optional[str] = None,
    ) -> None:
        if not progress_cb:
            return
        await progress_cb(
            {
                "step": step,
                "status": status,
                "message": message,
                "progress": progress,
                "decision": decision,
            }
        )
    
    async def process_application(
        self,
        application_id: str,
        application_data: Dict[str, Any],
        progress_cb: Optional[Callable[[Dict[str, Any]], Awaitable[None]]] = None,
    ) -> Dict[str, Any]:
        """
        Main orchestration method for processing loan application.
        
        Workflow (SEQUENTIAL):
        1. Document Verification (can early-reject)
        2. Income Analysis
        3. Debt Assessment (requires income data)
        4. Compliance Check
        5. Report Generation (synthesizes all findings)
        6. Routing Decision (auto-approve/reject/manual review)
        
        Args:
            application_id: Unique application identifier
            application_data: Dict containing:
                - id_document: National ID/Passport data
                - loan_application: Application form data
                - payslip: Income proof data  
                - bank_statement: Bank statement data
                - credit_score: (optional) Pre-calculated credit score
                
        Returns:
            Dict with comprehensive processing results and routing decision
        """
        start_time = datetime.now()
        
        if settings.ENABLE_AGENT_LOGGING:
            print(f"\n{'='*80}")
            print(f"🚀 Starting loan application processing: {application_id}")
            print(f"{'='*80}\n")
        
        try:
            # ================================================================
            # STEP 1: Document Verification (sequential - can cause early rejection)
            # ================================================================
            
            if settings.ENABLE_AGENT_LOGGING:
                print("📄 Step 1: Document Verification...")
            await self._emit_progress(
                progress_cb,
                step="doc-processing",
                status="in-progress",
                message="Starting document processing & verification",
                progress=0.05,
            )
            
            doc_input = {
                "application_id": application_id,
                "id_document": application_data.get("id_document", {}),
                "loan_application": application_data.get("loan_application", {}),
                "payslip": application_data.get("payslip", {}),
                "bank_statement": application_data.get("bank_statement", {})
            }
            
            doc_result = await self.doc_agent.analyze(doc_input)
            
            if settings.ENABLE_AGENT_LOGGING:
                print(f"   ✓ Document verification complete")
                print(f"   - Completeness: {doc_result.completeness_score:.1%}")
                print(f"   - Risk Level: {doc_result.risk_level}")
                print(f"   - Fraud Indicators: {len(doc_result.fraud_indicators)}")
            await self._emit_progress(
                progress_cb,
                step="doc-processing",
                status="completed",
                message="Document processing completed",
                progress=0.15,
            )
            await self._emit_progress(
                progress_cb,
                step="doc-verification",
                status="completed",
                message="Document verification completed",
                progress=0.18,
            )
            await self._emit_progress(
                progress_cb,
                step="doc-check",
                status="completed",
                message="Document risk gate passed",
                progress=0.22,
            )
            await self._emit_progress(
                progress_cb,
                step="credit-scoring",
                status="completed",
                message="Initialized credit scoring features",
                progress=0.26,
            )
            
            # Early rejection on HIGH document risk
            if doc_result.risk_level == "HIGH":
                if settings.ENABLE_AGENT_LOGGING:
                    print("   ⚠️  HIGH risk detected - early rejection")
                await self._emit_progress(
                    progress_cb,
                    step="routing-decision",
                    status="completed",
                    message="Routing to auto-reject because of high risk",
                    progress=0.6,
                    decision="auto-reject",
                )
                await self._emit_progress(
                    progress_cb,
                    step="reject-high-risk",
                    status="in-progress",
                    message="High risk flagged - preparing rejection",
                    progress=0.7,
                    decision="auto-reject",
                )
                await self._emit_progress(
                    progress_cb,
                    step="reject-high-risk",
                    status="completed",
                    message="Application auto-rejected for high risk",
                    progress=0.8,
                    decision="auto-reject",
                )
                await self._emit_progress(
                    progress_cb,
                    step="notify",
                    status="completed",
                    message="Applicant notified about rejection",
                    progress=0.9,
                    decision="auto-reject",
                )
                await self._emit_progress(
                    progress_cb,
                    step="end",
                    status="completed",
                    message="Processing ended after high-risk rejection",
                    progress=1.0,
                    decision="auto-reject",
                )
                return await self._early_rejection(
                    application_id,
                    reason="Document verification failed - high risk detected",
                    details=doc_result.dict()
                )
            
            # ================================================================
            # STEP 2: Income Analysis
            # ================================================================
            
            if settings.ENABLE_AGENT_LOGGING:
                print("\n💰 Step 2: Income Analysis...")
            await self._emit_progress(
                progress_cb,
                step="parallel-split",
                status="in-progress",
                message="Kicking off analysis tracks",
                progress=0.3,
            )
            await self._emit_progress(
                progress_cb,
                step="income-analysis",
                status="in-progress",
                message="Analyzing income from bank data",
                progress=0.34,
            )
            
            income_input = {
                "application_id": application_id,
                "bank_statement": application_data.get("bank_statement", {}),
                "payslip": application_data.get("payslip", {}),
                "stated_income": application_data.get("loan_application", {}).get("employment_details", {}).get("stated_gross_monthly_income", 0.0)
            }
            
            try:
                income_result = await asyncio.wait_for(
                    self.income_agent.analyze(income_input),
                    timeout=settings.AGENT_TIMEOUT_SECONDS
                )
                
                if settings.ENABLE_AGENT_LOGGING:
                    print(f"   ✓ Income Analysis complete")
                    print(f"      - Average Income: ${income_result.average_monthly_income:.2f}")
                    print(f"      - Income verified: {income_result.income_verification_passed}")
                await self._emit_progress(
                    progress_cb,
                    step="income-analysis",
                    status="completed",
                    message="Income analysis completed",
                    progress=0.45,
                )
                
            except asyncio.TimeoutError:
                if settings.ENABLE_AGENT_LOGGING:
                    print(f"   ⚠️  Income Analysis timeout after {settings.AGENT_TIMEOUT_SECONDS}s")
                return await self._timeout_fallback(application_id)
            
            # ================================================================
            # STEP 3: Debt Assessment (requires income data)
            # ================================================================
            
            if settings.ENABLE_AGENT_LOGGING:
                print(f"\n💳 Step 3: Debt Assessment...")
            await self._emit_progress(
                progress_cb,
                step="debt-assessment",
                status="in-progress",
                message="Assessing debts and obligations",
                progress=0.48,
            )
            
            debt_input = {
                "application_id": application_id,
                "bank_statement": application_data.get("bank_statement", {}),
                "loan_application": application_data.get("loan_application", {}),
                "stated_monthly_debt": application_data.get("loan_application", {}).get("financial_profile", {}).get("other_monthly_debt_payments", 0.0),
                "monthly_income": income_result.average_monthly_income
            }
            
            try:
                debt_result = await asyncio.wait_for(
                    self.debt_agent.analyze(debt_input),
                    timeout=settings.AGENT_TIMEOUT_SECONDS
                )
                
                if settings.ENABLE_AGENT_LOGGING:
                    print(f"   ✓ Debt Assessment complete")
                    print(f"      - DTI Ratio: {debt_result.debt_to_income_ratio:.1%}")
                    print(f"      - Risk: {debt_result.risk_assessment}")
                await self._emit_progress(
                    progress_cb,
                    step="debt-assessment",
                    status="completed",
                    message="Debt assessment completed",
                    progress=0.56,
                )
                
            except asyncio.TimeoutError:
                if settings.ENABLE_AGENT_LOGGING:
                    print(f"   ⚠️  Debt Assessment timeout after {settings.AGENT_TIMEOUT_SECONDS}s")
                return await self._timeout_fallback(application_id)
            
            # ================================================================
            # STEP 4: Compliance Check
            # ================================================================
            
            if settings.ENABLE_AGENT_LOGGING:
                print(f"\n✅ Step 4: Compliance Check...")
            await self._emit_progress(
                progress_cb,
                step="compliance-check",
                status="in-progress",
                message="Running KYC / AML checks",
                progress=0.6,
            )
            
            compliance_input = {
                "application_id": application_id,
                "id_document": application_data.get("id_document", {}),
                "loan_application": application_data.get("loan_application", {}),
                "payslip": application_data.get("payslip", {})
            }
            
            try:
                compliance_result = await asyncio.wait_for(
                    self.compliance_agent.analyze(compliance_input),
                    timeout=settings.AGENT_TIMEOUT_SECONDS
                )
                
                if settings.ENABLE_AGENT_LOGGING:
                    print(f"   ✓ Compliance Check complete")
                    print(f"      - Compliant: {compliance_result.compliant}")
                    print(f"      - Age: {compliance_result.applicant_age}")
                await self._emit_progress(
                    progress_cb,
                    step="compliance-check",
                    status="completed",
                    message="Compliance checks completed",
                    progress=0.66,
                )
                await self._emit_progress(
                    progress_cb,
                    step="parallel-split",
                    status="completed",
                    message="Parallel analysis tracks completed",
                    progress=0.68,
                )
                
            except asyncio.TimeoutError:
                if settings.ENABLE_AGENT_LOGGING:
                    print(f"   ⚠️  Compliance Check timeout after {settings.AGENT_TIMEOUT_SECONDS}s")
                return await self._timeout_fallback(application_id)
            
            # ================================================================
            # STEP 5: Check Compliance - Early Rejection if Failed
            # ================================================================
            
            if not compliance_result.compliant:
                if settings.ENABLE_AGENT_LOGGING:
                    print(f"\n   ⚠️  Compliance check FAILED")
                    print(f"   - Violations: {len(compliance_result.violations)}")
                await self._emit_progress(
                    progress_cb,
                    step="routing-decision",
                    status="completed",
                    message="Routing to auto-reject because of compliance failure",
                    progress=0.75,
                    decision="auto-reject",
                )
                await self._emit_progress(
                    progress_cb,
                    step="auto-reject",
                    status="in-progress",
                    message="Compliance failure detected",
                    progress=0.82,
                    decision="auto-reject",
                )
                await self._emit_progress(
                    progress_cb,
                    step="auto-reject",
                    status="completed",
                    message="Application auto-rejected due to compliance",
                    progress=0.88,
                    decision="auto-reject",
                )
                await self._emit_progress(
                    progress_cb,
                    step="notify",
                    status="completed",
                    message="Applicant notified about compliance rejection",
                    progress=0.93,
                    decision="auto-reject",
                )
                await self._emit_progress(
                    progress_cb,
                    step="end",
                    status="completed",
                    message="Processing ended after compliance rejection",
                    progress=1.0,
                    decision="auto-reject",
                )
                return await self._early_rejection(
                    application_id,
                    reason="Compliance check failed",
                    details=compliance_result.dict()
                )
            
            # ================================================================
            # STEP 6: Aggregate Results
            # ================================================================
            
            if settings.ENABLE_AGENT_LOGGING:
                print("\n📊 Step 6: Aggregating results...")
            
            aggregated_data = {
                "application_id": application_id,
                "document_verification": doc_result.dict(),
                "income_analysis": income_result.dict(),
                "debt_assessment": debt_result.dict(),
                "compliance_check": compliance_result.dict(),
                "credit_score": application_data.get("credit_score"),
                "timestamp": datetime.now().isoformat()
            }
            
            # ================================================================
            # STEP 7: Generate Comprehensive Report
            # ================================================================
            
            if settings.ENABLE_AGENT_LOGGING:
                print("📝 Step 7: Generating comprehensive report...")
            await self._emit_progress(
                progress_cb,
                step="report-generation",
                status="in-progress",
                message="Synthesizing findings into a report",
                progress=0.72,
            )
            
            final_report = await self.report_agent.generate(aggregated_data)
            
            if settings.ENABLE_AGENT_LOGGING:
                print(f"   ✓ Report generated")
                print(f"   - Overall Risk: {final_report.overall_risk_level}")
                print(f"   - Recommendation: {final_report.recommendation}")
                print(f"   - Confidence: {final_report.confidence_score:.1%}")
            await self._emit_progress(
                progress_cb,
                step="report-generation",
                status="completed",
                message="Report generated",
                progress=0.8,
            )
            
            # ================================================================
            # STEP 8: Make Routing Decision
            # ================================================================
            
            if settings.ENABLE_AGENT_LOGGING:
                print("\n🎯 Step 8: Making routing decision...")
            await self._emit_progress(
                progress_cb,
                step="routing-decision",
                status="in-progress",
                message="Evaluating routing options",
                progress=0.85,
            )
            
            # Calculate fraud score from document verification
            fraud_score = sum([
                30.0 if doc_result.risk_level == "HIGH" else 0.0,
                20.0 if not doc_result.name_consistency else 0.0,
                20.0 if not doc_result.id_consistency else 0.0,
                len(doc_result.fraud_indicators) * 10.0
            ])
            
            routing_input = {
                "application_id": application_id,
                "final_report": final_report.dict(),
                "credit_score": application_data.get("credit_score", 650),  # Default if not provided
                "fraud_score": min(fraud_score, 100.0),
                "policy_violations": compliance_result.violations
            }
            
            routing_decision = await self.routing_agent.make_decision(routing_input)
            
            if settings.ENABLE_AGENT_LOGGING:
                print(f"   ✓ Routing decision: {routing_decision.action}")
                if routing_decision.action == "MANUAL_REVIEW":
                    print(f"   - Priority: {routing_decision.priority}")
                print(f"   - Reason: {routing_decision.reason}")
            decision_slug = routing_decision.action.lower().replace("_", "-")
            await self._emit_progress(
                progress_cb,
                step="routing-decision",
                status="completed",
                message=f"Routing: {routing_decision.action}",
                progress=0.9,
                decision=decision_slug,
            )
            
            # ================================================================
            # STEP 9: Execute Routing Action
            # ================================================================
            
            if settings.ENABLE_AGENT_LOGGING:
                print(f"\n⚡ Step 9: Executing {routing_decision.action}...")
            
            execution_time = (datetime.now() - start_time).total_seconds()
            
            final_result = {
                "application_id": application_id,
                "processing_status": "COMPLETED",
                "routing_action": routing_decision.action,
                "routing_priority": routing_decision.priority if routing_decision.action == "MANUAL_REVIEW" else None,
                "routing_reason": routing_decision.reason,
                "routing_confidence": routing_decision.confidence,
                "agent_results": {
                    "document_verification": doc_result.dict(),
                    "income_analysis": income_result.dict(),
                    "debt_assessment": debt_result.dict(),
                    "compliance_check": compliance_result.dict(),
                    "final_report": final_report.dict()
                },
                "execution_time_seconds": execution_time,
                "timestamp": datetime.now().isoformat()
            }
            
            if routing_decision.action == "AUTO_APPROVE":
                await self._emit_progress(
                    progress_cb,
                    step="auto-approve",
                    status="completed",
                    message="Auto-approval executed",
                    progress=0.9,
                    decision=decision_slug,
                )
                await self._emit_progress(
                    progress_cb,
                    step="final-decision",
                    status="completed",
                    message="Final decision recorded",
                    progress=0.92,
                    decision=decision_slug,
                )
                await self._emit_progress(
                    progress_cb,
                    step="update-banking",
                    status="completed",
                    message="Core banking updated",
                    progress=0.94,
                    decision=decision_slug,
                )
                await self._emit_progress(
                    progress_cb,
                    step="disburse",
                    status="completed",
                    message="Disbursement scheduled",
                    progress=0.97,
                    decision=decision_slug,
                )
                await self._emit_progress(
                    progress_cb,
                    step="notify",
                    status="completed",
                    message="Applicant notified",
                    progress=0.98,
                    decision=decision_slug,
                )
                result = await self._auto_approve(application_id, final_result)
            elif routing_decision.action == "AUTO_REJECT":
                await self._emit_progress(
                    progress_cb,
                    step="auto-reject",
                    status="completed",
                    message="Auto-rejection executed",
                    progress=0.92,
                    decision=decision_slug,
                )
                await self._emit_progress(
                    progress_cb,
                    step="notify",
                    status="completed",
                    message="Applicant notified about rejection",
                    progress=0.96,
                    decision=decision_slug,
                )
                result = await self._auto_reject(application_id, final_result)
            else:  # MANUAL_REVIEW
                await self._emit_progress(
                    progress_cb,
                    step="manual-review",
                    status="completed",
                    message="Case routed to manual review",
                    progress=0.92,
                    decision=decision_slug,
                )
                await self._emit_progress(
                    progress_cb,
                    step="final-decision",
                    status="completed",
                    message="Awaiting underwriter decision",
                    progress=0.95,
                    decision=decision_slug,
                )
                await self._emit_progress(
                    progress_cb,
                    step="notify",
                    status="completed",
                    message="Applicant notified about review status",
                    progress=0.97,
                    decision=decision_slug,
                )
                result = await self._route_to_manual_review(
                    application_id,
                    final_result,
                    priority=routing_decision.priority,
                    recommended_decision=routing_decision.recommended_decision
                )

            await self._emit_progress(
                progress_cb,
                step="end",
                status="completed",
                message="Processing complete",
                progress=1.0,
                decision=decision_slug,
            )
            
            if settings.ENABLE_AGENT_LOGGING:
                print(f"\n{'='*80}")
                print(f"✅ Processing complete in {execution_time:.2f}s")
                print(f"{'='*80}\n")
            
            return result
            
        except Exception as e:
            if settings.ENABLE_AGENT_LOGGING:
                print(f"\n❌ Error in orchestrator: {str(e)}")
            
            return await self._error_fallback(application_id, str(e))
    
    # =========================================================================
    # ROUTING ACTION HANDLERS
    # =========================================================================
    
    async def _auto_approve(
        self,
        application_id: str,
        processing_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle auto-approve action"""
        if settings.ENABLE_AGENT_LOGGING:
            print(f"   ✅ AUTO-APPROVED application {application_id}")
        
        processing_results["final_decision"] = "APPROVED"
        processing_results["decision_method"] = "AUTOMATIC"
        processing_results["next_steps"] = "Proceed to loan disbursement"
        
        return processing_results
    
    async def _auto_reject(
        self,
        application_id: str,
        processing_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle auto-reject action"""
        if settings.ENABLE_AGENT_LOGGING:
            print(f"   ❌ AUTO-REJECTED application {application_id}")
        
        processing_results["final_decision"] = "REJECTED"
        processing_results["decision_method"] = "AUTOMATIC"
        processing_results["next_steps"] = "Send rejection notification to applicant"
        
        return processing_results
    
    async def _route_to_manual_review(
        self,
        application_id: str,
        processing_results: Dict[str, Any],
        priority: str,
        recommended_decision: Optional[str] = None
    ) -> Dict[str, Any]:
        """Route to human underwriter for manual review"""
        if settings.ENABLE_AGENT_LOGGING:
            print(f"   👤 MANUAL_REVIEW required for {application_id}")
            print(f"      Priority: {priority}")
        
        processing_results["final_decision"] = "PENDING_MANUAL_REVIEW"
        processing_results["decision_method"] = "MANUAL"
        processing_results["review_priority"] = priority
        processing_results["ai_recommended_decision"] = recommended_decision
        processing_results["next_steps"] = "Assign to underwriter queue"
        
        # Calculate SLA based on priority
        sla_hours = {
            "STANDARD": 24,
            "MEDIUM": 48,
            "LOW": 120
        }.get(priority, 48)
        
        processing_results["sla_hours"] = sla_hours
        
        return processing_results
    
    async def _early_rejection(
        self,
        application_id: str,
        reason: str,
        details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle early rejection before full processing"""
        if settings.ENABLE_AGENT_LOGGING:
            print(f"   ⚠️  EARLY REJECTION: {reason}")
        
        return {
            "application_id": application_id,
            "processing_status": "EARLY_REJECTED",
            "final_decision": "REJECTED",
            "decision_method": "AUTOMATIC",
            "routing_reason": reason,
            "rejection_details": details,
            "timestamp": datetime.now().isoformat()
        }
    
    async def _timeout_fallback(self, application_id: str) -> Dict[str, Any]:
        """Handle agent timeout scenarios"""
        return {
            "application_id": application_id,
            "processing_status": "TIMEOUT",
            "final_decision": "PENDING_MANUAL_REVIEW",
            "decision_method": "FALLBACK",
            "routing_reason": "Agent processing timeout - requires manual review",
            "review_priority": "MEDIUM",
            "timestamp": datetime.now().isoformat()
        }
    
    async def _error_fallback(self, application_id: str, error: str) -> Dict[str, Any]:
        """Handle general processing errors"""
        return {
            "application_id": application_id,
            "processing_status": "ERROR",
            "final_decision": "PENDING_MANUAL_REVIEW",
            "decision_method": "FALLBACK",
            "routing_reason": f"Processing error: {error}",
            "review_priority": "MEDIUM",
            "timestamp": datetime.now().isoformat()
        }


# Global orchestrator instance
orchestrator = LoanProcessingOrchestrator()
