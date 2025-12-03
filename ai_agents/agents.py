"""
Specialized AI Agents for loan processing orchestration using Google Genai SDK.
Each agent has specific responsibilities and tools.
"""

from typing import Dict, Any, Optional
from ai_agents.models import (
    DocumentVerificationOutput,
    IncomeAnalysisOutput,
    DebtAssessmentOutput,
    ComplianceCheckOutput,
    ReportGenerationOutput,
    RoutingDecisionOutput,
    generate_structured_content,
    generate_with_function_calling
)
from ai_agents.tool_declarations import (
    DOCUMENT_VERIFICATION_TOOLS,
    INCOME_ANALYSIS_TOOLS,
    DEBT_ASSESSMENT_TOOLS,
    COMPLIANCE_CHECK_TOOLS
)
from ai_agents.prompts import (
    DOCUMENT_VERIFICATION_AGENT_PROMPT,
    INCOME_ANALYSIS_AGENT_PROMPT,
    DEBT_ASSESSMENT_AGENT_PROMPT,
    COMPLIANCE_CHECK_AGENT_PROMPT,
    REPORT_GENERATION_AGENT_PROMPT,
    ROUTING_SUPERVISOR_AGENT_PROMPT
)
from backend.app.core.config import settings
import json



# ==============================================================================
# DOCUMENT VERIFICATION AGENT
# ==============================================================================

class DocumentVerificationAgent:
    """
    Analyzes loan application documents for completeness, consistency, and fraud indicators.
    """
    
    async def analyze(self, input_data: Dict[str, Any]) -> DocumentVerificationOutput:
        """
        Main entry point for document verification analysis.
        Uses function calling to execute document verification tools.
        
        Args:
            input_data: Dict containing application_id, id_document, loan_application, payslip, bank_statement
            
        Returns:
            DocumentVerificationOutput with analysis results
        """
        try:
            # Format prompt with input data
            prompt_text = DOCUMENT_VERIFICATION_AGENT_PROMPT.format(
                input_data=json.dumps(input_data, indent=2)
            )
            
            # Call Gemini with function calling enabled
            output = generate_with_function_calling(
                prompt=prompt_text,
                tools=DOCUMENT_VERIFICATION_TOOLS,
                response_schema=DocumentVerificationOutput,
                temperature=0.1
            )
            
            return output
            
        except Exception as e:
            print(f"Error in DocumentVerificationAgent: {e}")
            # Return safe default
            return DocumentVerificationOutput(
                is_valid=False,
                completeness_score=0.0,
                consistency_issues=[{"error": str(e)}],
                fraud_indicators=["Agent processing failed"],
                name_consistency=False,
                id_consistency=False,
                employer_consistency=False,
                address_consistency=False,
                risk_level="HIGH"
            )


# ==============================================================================
# INCOME ANALYSIS AGENT
# ==============================================================================

class IncomeAnalysisAgent:
    """
    Analyzes bank statements and payslips to verify income and detect discrepancies.
    """
    
    async def analyze(self, input_data: Dict[str, Any]) -> IncomeAnalysisOutput:
        """
        Analyze income from bank statement and payslip.
        Uses function calling to execute income analysis tools.
        
        Args:
            input_data: Dict containing application_id, bank_statement, payslip, stated_income
            
        Returns:
            IncomeAnalysisOutput with income verification results
        """
        try:
            prompt_text = INCOME_ANALYSIS_AGENT_PROMPT.format(
                input_data=json.dumps(input_data, indent=2)
            )
            
            output = generate_with_function_calling(
                prompt=prompt_text,
                tools=INCOME_ANALYSIS_TOOLS,
                response_schema=IncomeAnalysisOutput,
                temperature=0.1
            )
            
            return output
            
        except Exception as e:
            print(f"Error in IncomeAnalysisAgent: {e}")
            return IncomeAnalysisOutput(
                average_monthly_income=0.0,
                verified_monthly_income=0.0,
                income_stability_score=0.0,
                regular_income_detected=False,
                salary_deposits_count=0,
                unusual_transactions=[],
                income_trend="STABLE",
                income_verification_passed=False,
                stated_vs_actual_variance=100.0,
                confidence_score=0.0
            )


# ==============================================================================
# DEBT ASSESSMENT AGENT
# ==============================================================================

class DebtAssessmentAgent:
    """
    Analyzes debt obligations and calculates debt-to-income ratio.
    """
    
    async def analyze(self, input_data: Dict[str, Any]) -> DebtAssessmentOutput:
        """
        Analyze debt obligations and DTI ratio.
        Uses function calling to execute debt assessment tools.
        
        Args:
            input_data: Dict containing application_id, bank_statement, loan_application, stated_monthly_debt, monthly_income
            
        Returns:
            DebtAssessmentOutput with debt analysis results
        """
        try:
            prompt_text = DEBT_ASSESSMENT_AGENT_PROMPT.format(
                input_data=json.dumps(input_data, indent=2)
            )
            
            output = generate_with_function_calling(
                prompt=prompt_text,
                tools=DEBT_ASSESSMENT_TOOLS,
                response_schema=DebtAssessmentOutput,
                temperature=0.1
            )
            
            return output
            
        except Exception as e:
            print(f"Error in DebtAssessmentAgent: {e}")
            return DebtAssessmentOutput(
                declared_debt_payments=0.0,
                observed_debt_payments=0.0,
                total_outstanding_debt=0.0,
                monthly_debt_obligations=0.0,
                debt_to_income_ratio=0.0,
                hidden_liabilities_detected=False,
                existing_loans=[],
                debt_payment_transactions=[],
                discrepancy_detected=False,
                risk_assessment="HIGH"
            )


# ==============================================================================
# COMPLIANCE CHECK AGENT
# ==============================================================================

class ComplianceCheckAgent:
    """
    Verifies KYC/AML compliance and regulatory requirements.
    """
    
    async def analyze(self, input_data: Dict[str, Any]) -> ComplianceCheckOutput:
        """
        Perform compliance checks.
        Uses function calling to execute compliance verification tools.
        
        Args:
            input_data: Dict containing application_id, id_document, loan_application
            
        Returns:
            ComplianceCheckOutput with compliance verification results
        """
        try:
            prompt_text = COMPLIANCE_CHECK_AGENT_PROMPT.format(
                input_data=json.dumps(input_data, indent=2)
            )
            
            output = generate_with_function_calling(
                prompt=prompt_text,
                tools=COMPLIANCE_CHECK_TOOLS,
                response_schema=ComplianceCheckOutput,
                temperature=0.1
            )
            
            return output
            
        except Exception as e:
            print(f"Error in ComplianceCheckAgent: {e}")
            return ComplianceCheckOutput(
                compliant=False,
                age_verified=False,
                identity_verified=False,
                employment_verified=False,
                sanctions_clear=False,
                kyc_passed=False,
                aml_passed=False,
                id_expired=True,
                applicant_age=0,
                violations=[{"rule": "agent_error", "message": str(e)}]
            )


# ==============================================================================
# REPORT GENERATION AGENT
# ==============================================================================

class ReportGenerationAgent:
    """
    Synthesizes findings from all specialist agents into comprehensive report.
    """
    
    async def generate(self, aggregated_data: Dict[str, Any]) -> ReportGenerationOutput:
        """
        Generate comprehensive report from all agent findings.
        
        Args:
            aggregated_data: Dict containing results from all specialist agents
            
        Returns:
            ReportGenerationOutput with final report and recommendation
        """
        try:
            prompt_text = REPORT_GENERATION_AGENT_PROMPT.format(
                input_data=json.dumps(aggregated_data, indent=2, default=str)
            )
            
            output = generate_structured_content(
                prompt=prompt_text,
                response_schema=ReportGenerationOutput,
                temperature=0.2  # Slightly higher for more nuanced summaries
            )
            
            return output
            
        except Exception as e:
            print(f"Error in ReportGenerationAgent: {e}")
            return ReportGenerationOutput(
                summary="Report generation failed due to agent error.",
                strengths=[],
                weaknesses=["Agent processing failed"],
                risk_factors=["Unable to complete analysis"],
                overall_risk_level="VERY_HIGH",
                recommendation="REJECT",
                confidence_score=0.1
            )


# ==============================================================================
# ROUTING/SUPERVISOR AGENT
# ==============================================================================

class RoutingAgent:
    """
    Makes final routing decisions based on comprehensive report and credit score.
    """
    
    async def make_decision(self, input_data: Dict[str, Any]) -> RoutingDecisionOutput:
        """
        Make final routing decision.
        
        Args:
            input_data: Dict containing application_id, final_report, credit_score, fraud_score, policy_violations
            
        Returns:
            RoutingDecisionOutput with routing action and priority
        """
        try:
            prompt_text = ROUTING_SUPERVISOR_AGENT_PROMPT.format(
                input_data=json.dumps(input_data, indent=2, default=str)
            )
            
            output = generate_structured_content(
                prompt=prompt_text,
                response_schema=RoutingDecisionOutput,
                temperature=0.0  # Deterministic decisions
            )
            
            return output
            
        except Exception as e:
            print(f"Error in RoutingAgent: {e}")
            # Default to manual review on error
            return RoutingDecisionOutput(
                action="MANUAL_REVIEW",
                priority="MEDIUM",
                reason=f"Routing agent error: {str(e)}",
                confidence=0.5,
                recommended_decision="Requires manual review due to processing error"
            )
