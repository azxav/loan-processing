from sqlalchemy.orm import Session
from backend.app.models import models

class LedgerService:
    def record_transaction(self, db: Session, account_id: str, amount: float, direction: str, description: str):
        entry = models.LedgerEntry(
            transaction_id=f"TXN-{account_id}-{amount}", # Simple mock ID
            account_id=account_id,
            amount=amount,
            direction=direction,
            description=description
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry

ledger_service = LedgerService()
