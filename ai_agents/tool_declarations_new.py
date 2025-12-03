"""
Tool function declarations for Gemini function calling.
Defines all available tools for each agent using the official Google Genai API format.

NOTE: All object parameters are passed as JSON strings to avoid MALFORMED_FUNCTION_CALL errors.
"""

from typing import Dict, Callable, Any
import json
from ai_agents.tools import AgentTools

# ============================================================================
# DOCUMENT VERIFICATION TOOLS
# ============================================================================

CHECK_DOCUMENT_COMPLETENESS_DECLARATION = {
    "name": "check_document_completeness",
    "description": "Checks if all required fields are present in all documents. Pass document data from input_data as JSON strings.",
    "parameters": {
        "type": "object",
        "properties": {
            "id_doc_json": {
                "type": "string",
                "description": "ID document as JSON string"
            },
            "loan_app_json": {
                "type": "string",
                "description": "Loan application as JSON string"
            },
            "payslip_json": {
                "type": "string",
                "description": "Payslip as JSON string"
            },
            "bank_stmt_json": {
                "type": "string",
                "description": "Bank statement as JSON string"
            }
        },
        "required": ["id_doc_json", "loan_app_json", "payslip_json", "bank_stmt_json"]
    }
}

VALIDATE_CROSS_DOCUMENT_CONSISTENCY_DECLARATION = {
    "name": "validate_cross_document_consistency",
    "description": "Validates that key information (name, ID, employer) is consistent across documents. Pass document data as JSON strings.",
    "parameters": {
        "type": "object",
        "properties": {
            "id_doc_json": {
                "type": "string",
                "description": "ID document as JSON string"
            },
            "loan_app_json": {
                "type": "string",
                "description": "Loan application as JSON string"
            },
            "payslip_json": {
                "type": "string",
                "description": "Payslip as JSON string"
            },
            "bank_stmt_json": {
                "type": "string",
                "description": "Bank statement as JSON string"
            }
        },
        "required": ["id_doc_json", "loan_app_json", "payslip_json", "bank_stmt_json"]
    }
}

DETECT_FRAUD_PATTERNS_DECLARATION = {
    "name": "detect_fraud_patterns",
    "description": "Detects fraud indicators like expired IDs, gambling transactions, overdraft fees. Pass document data as JSON strings.",
    "parameters": {
        "type": "object",
        "properties": {
            "id_doc_json": {
                "type": "string",
                "description": "ID document as JSON string"
            },
            "bank_stmt_json": {
                "type": "string",
                "description": "Bank statement as JSON string"
            }
        },
        "required": ["id_doc_json", "bank_stmt_json"]
    }
}

# ============================================================================
# INCOME ANALYSIS TOOLS
# ============================================================================

CALCULATE_AVERAGE_INCOME_DECLARATION = {
    "name": "calculate_average_income",
    "description": "Calculates average monthly income from bank statement salary deposits. Pass bank_statement data as JSON string.",
    "parameters": {
        "type": "object",
        "properties": {
            "bank_stmt_json": {
                "type": "string",
                "description": "Bank statement as JSON string with transactions array"
            }
        },
        "required": ["bank_stmt_json"]
    }
}

ANALYZE_INCOME_STABILITY_DECLARATION = {
    "name": "analyze_income_stability",
    "description": "Analyzes income stability by calculating variance in salary amounts. Pass bank_statement as JSON string.",
    "parameters": {
        "type": "object",
        "properties": {
            "bank_stmt_json": {
                "type": "string",
                "description": "Bank statement as JSON string"
            }
        },
        "required": ["bank_stmt_json"]
    }
}

FLAG_UNUSUAL_TRANSACTIONS_DECLARATION = {
    "name": "flag_unusual_transactions",
    "description": "Flags unusual transactions like gambling, overdraft fees, large withdrawals. Pass bank_statement as JSON string.",
    "parameters": {
        "type": "object",
        "properties": {
            "bank_stmt_json": {
                "type": "string",
                "description": "Bank statement as JSON string"
            }
        },
        "required": ["bank_stmt_json"]
    }
}

# ============================================================================
# DEBT ASSESSMENT TOOLS
# ============================================================================

EXTRACT_DEBT_OBLIGATIONS_DECLARATION = {
    "name": "extract_debt_obligations",
    "description": "Extracts monthly debt obligations from bank transactions and compares with declared debts. Pass documents as JSON strings.",
    "parameters": {
        "type": "object",
        "properties": {
            "bank_stmt_json": {
                "type": "string",
                "description": "Bank statement as JSON string"
            },
            "loan_app_json": {
                "type": "string",
                "description": "Loan application as JSON string"
            }
        },
        "required": ["bank_stmt_json", "loan_app_json"]
    }
}

CALCULATE_DTI_DECLARATION = {
    "name": "calculate_dti",
    "description": "Calculates debt-to-income ratio by dividing total monthly debt by monthly income.",
    "parameters": {
        "type": "object",
        "properties": {
            "monthly_debt": {
                "type": "number",
                "description": "Total monthly debt obligations in dollars"
            },
            "monthly_income": {
                "type": "number",
                "description": "Total monthly income in dollars"
            }
        },
        "required": ["monthly_debt", "monthly_income"]
    }
}

# ============================================================================
# COMPLIANCE TOOLS
# ============================================================================

VERIFY_AGE_REQUIREMENTS_DECLARATION = {
    "name": "verify_age_requirements",
    "description": "Verifies applicant age is within acceptable range (21-65 years). Pass ID document as JSON string.",
    "parameters": {
        "type": "object",
        "properties": {
            "id_doc_json": {
                "type": "string",
                "description": "ID document as JSON string with date_of_birth"
            }
        },
        "required": ["id_doc_json"]
    }
}

CHECK_SANCTIONS_WATCHLIST_DECLARATION = {
    "name": "check_sanctions_watchlist",
    "description": "Checks if applicant is on sanctions watchlist. (Mock implementation)",
    "parameters": {
        "type": "object",
        "properties": {
            "full_name": {
                "type": "string",
                "description": "Full name of applicant"
            },
            "national_id": {
                "type": "string",
                "description": "National ID number"
            }
        },
        "required": ["full_name", "national_id"]
    }
}

VALIDATE_EMPLOYMENT_STATUS_DECLARATION = {
    "name": "validate_employment_status",
    "description": "Validates employment details from loan application match payslip. Pass documents as JSON strings.",
    "parameters": {
        "type": "object",
        "properties": {
            "loan_app_json": {
                "type": "string",
                "description": "Loan application as JSON string"
            },
            "payslip_json": {
                "type": "string",
                "description": "Payslip as JSON string"
            }
        },
        "required": ["loan_app_json", "payslip_json"]
    }
}

# ============================================================================
# TOOL COLLECTIONS BY AGENT
# ============================================================================

DOCUMENT_VERIFICATION_TOOLS = [
    CHECK_DOCUMENT_COMPLETENESS_DECLARATION,
    VALIDATE_CROSS_DOCUMENT_CONSISTENCY_DECLARATION,
    DETECT_FRAUD_PATTERNS_DECLARATION
]

INCOME_ANALYSIS_TOOLS = [
    CALCULATE_AVERAGE_INCOME_DECLARATION,
    ANALYZE_INCOME_STABILITY_DECLARATION,
    FLAG_UNUSUAL_TRANSACTIONS_DECLARATION
]

DEBT_ASSESSMENT_TOOLS = [
    EXTRACT_DEBT_OBLIGATIONS_DECLARATION,
    CALCULATE_DTI_DECLARATION
]

COMPLIANCE_CHECK_TOOLS = [
    VERIFY_AGE_REQUIREMENTS_DECLARATION,
    CHECK_SANCTIONS_WATCHLIST_DECLARATION,
    VALIDATE_EMPLOYMENT_STATUS_DECLARATION
]

# ============================================================================
# FUNCTION MAPPING AND EXECUTION
# ============================================================================

def execute_function_call(function_name: str, arguments: Dict[str, Any]) -> Any:
    """
    Execute a function call by name with provided arguments.
    Converts JSON string parameters back to dicts before calling actual tool functions.
    
    Args:
        function_name: Name of the function to call
        arguments: Arguments dict from Gemini (may contain JSON strings)
        
    Returns:
        Result from the function execution
    """
    # Convert JSON string parameters back to dicts
    processed_args = {}
    for key, value in arguments.items():
        if key.endswith('_json') and isinstance(value, str):
            # Parse JSON string to dict
            try:
                dict_key = key.replace('_json', '')
                processed_args[dict_key] = json.loads(value)
            except json.JSONDecodeError as e:
                raise ValueError(f"Failed to parse JSON parameter {key}: {e}")
        else:
            # Keep non-JSON parameters as-is
            processed_args[key] = value
    
    # Map function names to actual tool methods
    tool_map = {
        "check_document_completeness": AgentTools.check_document_completeness,
        "validate_cross_document_consistency": AgentTools.validate_cross_document_consistency,
        "detect_fraud_patterns": AgentTools.detect_fraud_patterns,
        "calculate_average_income": AgentTools.calculate_average_income,
        "analyze_income_stability": AgentTools.analyze_income_stability,
        "flag_unusual_transactions": AgentTools.flag_unusual_transactions,
        "extract_debt_obligations": AgentTools.extract_debt_obligations,
        "calculate_dti": AgentTools.calculate_dti,
        "verify_age_requirements": AgentTools.verify_age_requirements,
        "check_sanctions_watchlist": AgentTools.check_sanctions_watchlist,
        "validate_employment_status": AgentTools.validate_employment_status
    }
    
    if function_name not in tool_map:
        raise ValueError(f"Unknown function: {function_name}")
    
    # Call the actual tool function with processed arguments
    tool_function = tool_map[function_name]
    result = tool_function(**processed_args)
    
    return result

