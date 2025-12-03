from typing import Dict, Any
from sqlalchemy.orm import Session
from backend.app.models import models
from backend.app.services.ledger_service import ledger_service
import uuid

class BankingService:
    def create_customer(self, db: Session, customer_data: Dict[str, Any]) -> models.Customer:
        db_customer = models.Customer(**customer_data)
        db.add(db_customer)
        db.commit()
        db.refresh(db_customer)
        return db_customer

    def create_loan_account(self, db: Session, loan_data: Dict[str, Any], customer_id: int) -> models.LoanApplication:
        # In this mock, the LoanApplication acts as the "Loan Account" in the core banking system
        # In a real scenario, this would make an API call to Temenos/Mambu
        
        # We assume the loan application is already created in the system
        # This method might be used to "activate" it in the core banking system
        pass

    def book_disbursement(self, db: Session, loan_id: int, amount: float) -> str:
        # Record disbursement in ledger
        transaction_id = str(uuid.uuid4())
        
        # Debit Loan Account (Asset)
        ledger_service.record_transaction(
            db=db,
            account_id=f"LOAN-{loan_id}",
            amount=amount,
            direction="DEBIT",
            description=f"Disbursement for Loan #{loan_id}"
        )
        
        # Credit Customer Account (Liability/Cash)
        ledger_service.record_transaction(
            db=db,
            account_id=f"CUST-ACC-{loan_id}",
            amount=amount,
            direction="CREDIT",
            description=f"Disbursement credit to customer for Loan #{loan_id}"
        )
        
        return transaction_id

banking_service = BankingService()
