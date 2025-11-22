from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, JSON, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class ApplicationStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SUBMITTED = "SUBMITTED"
    PROCESSING = "PROCESSING"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    DISBURSED = "DISBURSED"

class DocumentType(str, enum.Enum):
    IDENTITY = "IDENTITY"
    INCOME = "INCOME"
    BANK_STATEMENT = "BANK_STATEMENT"
    APPLICATION_FORM = "APPLICATION_FORM"
    OTHER = "OTHER"

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, index=True)
    last_name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    phone = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    applications = relationship("LoanApplication", back_populates="applicant")

class LoanApplication(Base):
    __tablename__ = "loan_applications"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.DRAFT)
    loan_amount = Column(Float)
    loan_purpose = Column(String)
    loan_term_months = Column(Integer)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    applicant = relationship("Customer", back_populates="applications")
    documents = relationship("Document", back_populates="application")
    audit_logs = relationship("AuditLog", back_populates="application")
    credit_score = relationship("CreditScore", uselist=False, back_populates="application")

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("loan_applications.id"))
    document_type = Column(Enum(DocumentType))
    file_path = Column(String)
    extracted_data = Column(JSON, nullable=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    application = relationship("LoanApplication", back_populates="documents")

class CreditScore(Base):
    __tablename__ = "credit_scores"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("loan_applications.id"))
    score = Column(Integer)
    risk_level = Column(String)
    details = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    application = relationship("LoanApplication", back_populates="credit_score")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("loan_applications.id"))
    action = Column(String)
    details = Column(String)
    actor = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    application = relationship("LoanApplication", back_populates="audit_logs")

class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String, unique=True, index=True)
    account_id = Column(String, index=True)
    amount = Column(Float)
    currency = Column(String, default="USD")
    direction = Column(String) # DEBIT or CREDIT
    description = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
