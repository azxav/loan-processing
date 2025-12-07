import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

from pymongo import MongoClient

from backend.app.core.config import settings
from backend.app.models.models import ApplicationStatus, DocumentType

INPUT_DIR = Path(__file__).resolve().parents[1] / "input"
DATASETS = ["", "_2", "_3", "_4"]


def load_json(filename: str) -> Optional[Dict]:
    path = INPUT_DIR / filename
    if not path.exists():
        return None
    with path.open() as f:
        return json.load(f)


def seed_dataset(suffix: str, db) -> Optional[str]:
    loan_data = load_json(f"loan_application{suffix}.json")
    if not loan_data:
        return None

    created_at = datetime.fromisoformat(loan_data.get("application_date", datetime.utcnow().isoformat()))
    application_doc = {
        "external_application_id": loan_data.get("application_id"),
        "customer_id": loan_data.get("applicant", {}).get("customer_id", ""),
        "loan_amount": loan_data.get("requested_amount"),
        "loan_purpose": loan_data.get("purpose_of_loan"),
        "loan_term_months": loan_data.get("requested_term_months"),
        "status": ApplicationStatus.SUBMITTED.value,
        "created_at": created_at,
        "updated_at": None,
        "raw_payload": loan_data,
    }

    result = db.loan_applications.insert_one(application_doc)
    app_id = str(result.inserted_id)

    document_specs = [
        ("id", DocumentType.IDENTITY.value),
        ("payslip", DocumentType.INCOME.value),
        ("bank_statement", DocumentType.BANK_STATEMENT.value),
    ]
    for prefix, doc_type in document_specs:
        data = load_json(f"{prefix}{suffix}.json")
        if not data:
            continue
        db.documents.insert_one(
            {
                "application_id": app_id,
                "document_type": doc_type,
                "file_path": f"input/{prefix}{suffix}.json",
                "extracted_data": data,
                "is_verified": True,
                "created_at": datetime.utcnow(),
            }
        )

    return app_id


def main():
    client = MongoClient(settings.get_mongo_uri())
    db = client[settings.MONGODB_DB]

    # Make seeding idempotent by clearing existing records
    db.loan_applications.delete_many({})
    db.documents.delete_many({})

    inserted = []
    for suffix in DATASETS:
        app_id = seed_dataset(suffix, db)
        if app_id:
            inserted.append(app_id)

    print(
        f"Seeded {len(inserted)} loan applications and related documents into '{settings.MONGODB_DB}'."
    )
    client.close()


if __name__ == "__main__":
    main()
