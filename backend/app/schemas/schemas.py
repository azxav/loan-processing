from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.models.models import ApplicationStatus, DocumentType

# Customer Schemas
class CustomerBase(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class Customer(CustomerBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Document Schemas
class DocumentBase(BaseModel):
    document_type: DocumentType

class DocumentCreate(DocumentBase):
    pass

class Document(DocumentBase):
    id: int
    application_id: int
    file_path: str
    extracted_data: Optional[Dict[str, Any]] = None
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Loan Application Schemas
class LoanApplicationBase(BaseModel):
    loan_amount: float
    loan_purpose: str
    loan_term_months: int

class LoanApplicationCreate(LoanApplicationBase):
    customer_id: int

class LoanApplication(LoanApplicationBase):
    id: int
    customer_id: int
    status: ApplicationStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    documents: List[Document] = []

    class Config:
        from_attributes = True

# Credit Score Schemas
class CreditScoreBase(BaseModel):
    score: int
    risk_level: str
    details: Dict[str, Any]

class CreditScoreCreate(CreditScoreBase):
    application_id: int

class CreditScore(CreditScoreBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
