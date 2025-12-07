from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from backend.app.models.models import ApplicationStatus, DocumentType


class MongoModel(BaseModel):
    """
    Base model for Mongo-backed responses with stringified ids.
    """

    model_config = ConfigDict(from_attributes=True)


# Customer Schemas
class CustomerBase(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class Customer(CustomerBase, MongoModel):
    id: str
    created_at: datetime


# Document Schemas
class DocumentBase(BaseModel):
    document_type: DocumentType


class DocumentCreate(DocumentBase):
    pass


class Document(DocumentBase, MongoModel):
    id: str
    application_id: str
    file_path: str
    extracted_data: Optional[Dict[str, Any]] = None
    is_verified: bool
    created_at: datetime


# Loan Application Schemas
class LoanApplicationBase(BaseModel):
    loan_amount: float
    loan_purpose: str
    loan_term_months: int


class LoanApplicationCreate(LoanApplicationBase):
    customer_id: str


class LoanApplication(LoanApplicationBase, MongoModel):
    id: str
    customer_id: str
    status: ApplicationStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    documents: List[Document] = Field(default_factory=list)


# Credit Score Schemas
class CreditScoreBase(BaseModel):
    score: int
    risk_level: str
    details: Dict[str, Any]


class CreditScoreCreate(CreditScoreBase):
    application_id: str


class CreditScore(CreditScoreBase, MongoModel):
    id: str
    created_at: datetime
