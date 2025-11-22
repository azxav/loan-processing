DOCUMENT_VERIFICATION_PROMPT = """
Analyze the following document text and extract key information.
Document Type: {document_type}
Text:
{document_text}

Provide the output in JSON format with the following keys:
- is_valid: boolean
- issues: list of strings (potential fraud indicators or missing info)
- extracted_fields: dictionary of extracted data
"""

LOAN_EVALUATION_PROMPT = """
Evaluate the following loan application based on the provided data.

Application Data:
{application_data}

Risk Policy:
- Minimum Credit Score: 600
- Max Debt-to-Income Ratio: 45%

Provide the output in JSON format with:
- decision: "APPROVE", "REJECT", or "MANUAL_REVIEW"
- risk_level: "LOW", "MEDIUM", "HIGH"
- reason: string explanation
- confidence_score: float (0-1)
"""
