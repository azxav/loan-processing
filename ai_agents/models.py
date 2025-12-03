from google import genai
from backend.app.core.config import settings
from typing import Optional, Dict, Any, Type
from pydantic import BaseModel, Field
import json

# ============================================================================
# Pydantic Schemas for Structured JSON Input/Output
# ============================================================================

class DocumentVerificationInput(BaseModel):
    """Input schema for Document Verification Agent"""
    application_id: str
    id_document: Dict[str, Any]  # From id.json
    loan_application: Dict[str, Any]  # From loan_application.json  
    payslip: Dict[str, Any]  # From payslip.json
    bank_statement: Dict[str, Any]  # From bank_statement.json

class DocumentVerificationOutput(BaseModel):
    """Output schema for Document Verification Agent"""
    is_valid: bool
    completeness_score: float  # 0-1
    consistency_issues: list[Dict[str, Any]]  # e.g., name mismatch between docs
    fraud_indicators: list[str]  # e.g., expired ID, mismatched addresses
    name_consistency: bool  # All docs have same name
    id_consistency: bool  # National ID matches across docs
    employer_consistency: bool  # Employer name matches payslip and application
    address_consistency: bool  # Address matches across documents
    risk_level: str  # LOW, MEDIUM, HIGH

class IncomeAnalysisInput(BaseModel):
    """Input schema for Income Analysis Agent"""
    application_id: str
    bank_statement: Dict[str, Any]  # Contains transactions array
    payslip: Dict[str, Any]  # Contains earnings.gross_pay and net_pay
    stated_income: float  # From loan_application.employment_details.stated_gross_monthly_income

class IncomeAnalysisOutput(BaseModel):
    """Output schema for Income Analysis Agent"""
    average_monthly_income: float  # Calculated from bank transactions
    verified_monthly_income: float  # From payslip
    income_stability_score: float  # 0-1, based on regularity
    regular_income_detected: bool  # Payroll deposits found
    salary_deposits_count: int  # Number of salary deposits in statement
    unusual_transactions: list[Dict[str, Any]]  # Flagged transactions
    income_trend: str  # INCREASING, STABLE, DECREASING
    income_verification_passed: bool  # Bank income matches payslip
    stated_vs_actual_variance: float  # Percentage difference
    confidence_score: float  # 0-1

class DebtAssessmentInput(BaseModel):
    """Input schema for Debt Assessment Agent"""
    application_id: str
    bank_statement: Dict[str, Any]  # Contains debt payment transactions
    loan_application: Dict[str, Any]  # Contains financial_profile.existing_loan_accounts
    stated_monthly_debt: float  # From financial_profile.other_monthly_debt_payments
    monthly_income: float  # From income analysis

class DebtAssessmentOutput(BaseModel):
    """Output schema for Debt Assessment Agent"""
    declared_debt_payments: float  # From application
    observed_debt_payments: float  # From bank transactions
    total_outstanding_debt: float  # Sum of existing loans
    monthly_debt_obligations: float  # From transaction analysis
    debt_to_income_ratio: float  # DTI calculation
    hidden_liabilities_detected: bool  # Undeclared debts found
    existing_loans: list[Dict[str, Any]]  # From application
    debt_payment_transactions: list[Dict[str, Any]]  # DEBT_* category transactions
    discrepancy_detected: bool  # Stated vs observed mismatch
    risk_assessment: str  # LOW, MEDIUM, HIGH

class ComplianceCheckInput(BaseModel):
    """Input schema for Compliance Check Agent"""
    application_id: str
    id_document: Dict[str, Any]  # From id.json
    loan_application: Dict[str, Any]  # Contains applicant details

class ComplianceCheckOutput(BaseModel):
    """Output schema for Compliance Check Agent"""
    compliant: bool
    age_verified: bool  # DOB makes applicant 21-65 years old
    identity_verified: bool  # ID not expired, valid
    employment_verified: bool  # Employer matches payslip
    sanctions_clear: bool  # Not on watchlist (placeholder for MVP)
    kyc_passed: bool  # All KYC checks passed
    aml_passed: bool  # AML checks passed (placeholder for MVP)
    id_expired: bool  # Check expiry date
    applicant_age: int  # Calculated age
    violations: list[Dict[str, str]]  # List of compliance issues

class ReportGenerationInput(BaseModel):
    """Input schema for Report Generation Agent"""
    application_id: str
    document_verification: DocumentVerificationOutput
    income_analysis: IncomeAnalysisOutput
    debt_assessment: DebtAssessmentOutput
    compliance_check: ComplianceCheckOutput
    credit_score: Optional[float] = None

class ReportGenerationOutput(BaseModel):
    """Output schema for Report Generation Agent"""
    summary: str
    strengths: list[str]
    weaknesses: list[str]
    risk_factors: list[str]
    overall_risk_level: str  # VERY_LOW, LOW, MEDIUM, HIGH, VERY_HIGH
    recommendation: str  # APPROVE, REJECT, MANUAL_REVIEW
    confidence_score: float  # 0-1

class RoutingDecisionInput(BaseModel):
    """Input schema for Routing/Supervisor Agent"""
    application_id: str
    final_report: ReportGenerationOutput
    credit_score: float
    fraud_score: float
    policy_violations: list[Dict[str, str]]

class RoutingDecisionOutput(BaseModel):
    """Output schema for Routing/Supervisor Agent"""
    action: str  # AUTO_APPROVE, AUTO_REJECT, MANUAL_REVIEW
    priority: str  # STANDARD, MEDIUM, LOW (for manual review)
    reason: str
    confidence: float  # 0-1
    recommended_decision: Optional[str] = None

# ============================================================================
# Gemini Model Configuration with Structured Output (Official SDK Pattern)
# ============================================================================

def get_gemini_client():
    """
    Get configured Gemini client using official Google Genai SDK.
    
    Returns:
        genai.Client instance or None if API key missing
    """
    if not settings.GOOGLE_API_KEY:
        print("Warning: GOOGLE_API_KEY not set. AI features will not work.")
        return None
    
    # Initialize client with API key from environment
    client = genai.Client(api_key=settings.GOOGLE_API_KEY)
    return client

def generate_structured_content(
    prompt: str,
    response_schema: Type[BaseModel],
    model_version: str = None,
    temperature: float = 0.1
):
    """
    Generate structured content using Gemini with JSON schema validation.
    
    Args:
        prompt: The prompt text to send to the model
        response_schema: Pydantic model class for structured JSON output
        model_version: Gemini model version (defaults to settings.GEMINI_MODEL_VERSION)
        temperature: Temperature for generation (0.0-1.0)
        
    Returns:
        Validated Pydantic model instance
        
    Raises:
        ValueError: If response cannot be parsed or validated
    """
    client = get_gemini_client()
    if not client:
        raise ValueError("Gemini client not initialized - check GOOGLE_API_KEY")
    
    if model_version is None:
        model_version = settings.GEMINI_MODEL_VERSION
    
    try:
        # Generate content with structured output
        response = client.models.generate_content(
            model=model_version,
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_json_schema": response_schema.model_json_schema(),
                "temperature": temperature,
            },
        )
        
        # Validate response using Pydantic
        validated_data = response_schema.model_validate_json(response.text)
        return validated_data
        
    except Exception as e:
        raise ValueError(f"Failed to generate structured content: {e}")

def generate_with_function_calling(
    prompt: str,
    tools: list,
    response_schema: Type[BaseModel],
    max_turns: int = 10,
    temperature: float = 0.1
) -> BaseModel:
    """
    Generate structured content with function calling support.
    Implements multi-turn conversation where model can call tools.
    
    Flow:
    1. Send prompt with available tools
    2. Model responds with function_call or text
    3. If function_call: execute function, send result back, repeat
    4. If text: validate against schema and return
    
    Args:
        prompt: The initial prompt text
        tools: List of function declarations dicts
        response_schema: Pydantic model for final output validation
        max_turns: Maximum number of conversation turns
        temperature: Temperature for generation
        
    Returns:
        Validated Pydantic model instance
        
    Raises:
        ValueError: If unable to generate valid response
    """
    from google.genai import types
    from ai_agents.tool_declarations import execute_function_call
    
    client = get_gemini_client()
    if not client:
        raise ValueError("Gemini client not initialized - check GOOGLE_API_KEY")
    
    # Import tool declarations module to get execute_function_call
    model_version = settings.GEMINI_MODEL_VERSION
    
    # Create tools configuration
    tool_config = types.Tool(function_declarations=tools)
    config = types.GenerateContentConfig(
        tools=[tool_config],
        temperature=temperature
    )
    
    # Initialize conversation contents
    contents = [
        types.Content(
            role="user",
            parts=[types.Part(text=prompt)]
        )
    ]
    
    # Multi-turn conversation loop
    turn = 0
    while turn < max_turns:
        # Generate content
        response = client.models.generate_content(
            model=model_version,
            contents=contents,
            config=config
        )
        
        # Debug logging
        if settings.ENABLE_AGENT_LOGGING:
            print(f"   [Turn {turn + 1}] Response received")
            # print(f"   [Turn {turn + 1}] Raw response: {response}") # Too verbose
            if not response.candidates:
                print(f"   [Turn {turn + 1}] WARNING: No candidates in response!")
                if hasattr(response, 'prompt_feedback'):
                    print(f"   [Turn {turn + 1}] Prompt feedback: {response.prompt_feedback}")
            else:
                candidate0 = response.candidates[0]
                if not getattr(candidate0, "content", None):
                    print(f"   [Turn {turn + 1}] WARNING: Candidate has no content!")
                    print(f"   [Turn {turn + 1}] Finish reason: {getattr(candidate0, 'finish_reason', 'N/A')}")
                    print(f"   [Turn {turn + 1}] Safety ratings: {getattr(candidate0, 'safety_ratings', 'N/A')}")
                elif not getattr(candidate0.content, "parts", None):
                    print(f"   [Turn {turn + 1}] WARNING: No parts in candidate content!")
        
        # Check if response has function call
        if response.candidates and len(response.candidates) > 0:
            candidate = response.candidates[0]
            
            if candidate.content and getattr(candidate.content, "parts", None):
                first_part = candidate.content.parts[0]
                
                # # Debug: log the part type and content (minimal)
                # if settings.ENABLE_AGENT_LOGGING:
                #     has_function_call = hasattr(first_part, 'function_call') and first_part.function_call
                #     has_text = hasattr(first_part, 'text') and first_part.text
                #     print(f"   [Turn {turn + 1}] Part type: function_call={has_function_call}, text={has_text}")
                
                # Check if it's a function call
                if hasattr(first_part, 'function_call') and first_part.function_call:
                    function_call = first_part.function_call
                    
                    if settings.ENABLE_AGENT_LOGGING:
                        print(f"   [Turn {turn + 1}] Function call: {function_call.name}")
                    
                    # Execute the function
                    try:
                        function_name = function_call.name
                        function_args = dict(function_call.args) if function_call.args else {}
                        
                        # Execute function
                        result = execute_function_call(function_name, function_args)
                        
                        if settings.ENABLE_AGENT_LOGGING:
                            print(f"   [Turn {turn + 1}] Function executed successfully")
                            print(f"   [Turn {turn + 1}] Switching to structured JSON output mode...")
                        
                        # After function execution, make a new call with structured output
                        # Build a summary prompt with function results
                        summary_prompt = f"""Based on the function call results below, generate the final structured output.

Function called: {function_name}
Function arguments: {json.dumps(function_args, indent=2)}
Function result: {json.dumps(result, indent=2, default=str)}

Now generate the final analysis in the required JSON schema format."""
                        
                        # Make a new structured generation call (without tools)
                        structured_response = client.models.generate_content(
                            model=model_version,
                            contents=summary_prompt,
                            config=types.GenerateContentConfig(
                                response_mime_type="application/json",
                                response_json_schema=response_schema.model_json_schema(),
                                temperature=temperature
                            )
                        )
                        
                        # Validate and return
                        validated_data = response_schema.model_validate_json(structured_response.text)
                        
                        if settings.ENABLE_AGENT_LOGGING:
                            print(f"   [Turn {turn + 1}] Structured output validated successfully")
                        
                        return validated_data
                        
                    except Exception as e:
                        if settings.ENABLE_AGENT_LOGGING:
                            print(f"   [Turn {turn + 1}] Function execution error: {str(e)}")
                        
                        # If function execution fails, return error in response
                        error_part = types.Part.from_function_response(
                            name=function_call.name,
                            response={"error": str(e)}
                        )
                        contents.append(candidate.content)
                        contents.append(
                            types.Content(
                                role="user",
                                parts=[error_part]
                            )
                        )
                        turn += 1
                        continue
                
                # If not a function call, it's final text response
                elif hasattr(first_part, 'text') and first_part.text:
                    if settings.ENABLE_AGENT_LOGGING:
                        print(f"   [Turn {turn + 1}] Got text response, validating...")
                    
                    # Got final text response - validate against schema
                    try:
                        validated_data = response_schema.model_validate_json(first_part.text)
                        return validated_data
                    except Exception as e:
                        # Try accessing response.text
                        try:
                            validated_data = response_schema.model_validate_json(response.text)
                            return validated_data
                        except:
                            if settings.ENABLE_AGENT_LOGGING:
                                print(f"   [Turn {turn + 1}] Validation failed: {str(e)}")
                                print(f"   Response text: {first_part.text[:200]}...")
                            raise ValueError(f"Failed to validate final response against schema: {e}. Response: {first_part.text[:500]}")
        
        # If we get here without returning, increment turn
        turn += 1
        
        if settings.ENABLE_AGENT_LOGGING:
            print(f"   [Turn {turn}] No valid function call or text response found, continuing...")
        
        # If max turns reached, try to extract any text response
        if turn >= max_turns:
            raise ValueError(f"Max turns ({max_turns}) reached without valid response")
    
    raise ValueError("Function calling loop completed without valid response")

def parse_json_response(response: Any, schema: Type[BaseModel]) -> BaseModel:
    """
    Parse and validate Gemini JSON response against Pydantic schema.
    
    Args:
        response: Gemini response object
        schema: Pydantic model class to validate against
        
    Returns:
        Validated Pydantic model instance
        
    Raises:
        ValueError: If response cannot be parsed or validated
    """
    try:
        # Get text from response
        response_text = response.text
        
        # Parse JSON
        response_data = json.loads(response_text)
        
        # Validate against schema
        validated_data = schema(**response_data)
        
        return validated_data
        
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON response: {e}")
    except Exception as e:
        raise ValueError(f"Schema validation failed: {e}")
