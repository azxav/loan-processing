from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pymongo.database import Database

from backend.app.core.database import get_db
from backend.app.core.mongo_utils import serialize_doc, serialize_many, to_object_id
from backend.app.models.models import ApplicationStatus
from backend.app.schemas import schemas

router = APIRouter()


@router.post("/", response_model=schemas.LoanApplication)
async def create_loan_application(
    application: schemas.LoanApplicationCreate,
    db: Database = Depends(get_db),
):
    now = datetime.utcnow()
    payload = {
        "customer_id": application.customer_id,
        "status": ApplicationStatus.DRAFT.value,
        "loan_amount": application.loan_amount,
        "loan_purpose": application.loan_purpose,
        "loan_term_months": application.loan_term_months,
        "created_at": now,
        "updated_at": None,
    }
    insert_result = db.loan_applications.insert_one(payload)
    stored = db.loan_applications.find_one({"_id": insert_result.inserted_id})
    if not stored:
        raise HTTPException(status_code=500, detail="Could not create application")
    stored["documents"] = []
    return serialize_doc(stored)


@router.get("/{application_id}", response_model=schemas.LoanApplication)
async def read_loan_application(
    application_id: str,
    db: Database = Depends(get_db),
):
    try:
        oid = to_object_id(application_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Application not found")

    application = db.loan_applications.find_one({"_id": oid})
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")

    application["documents"] = serialize_many(
        db.documents.find({"application_id": application_id})
    )
    return serialize_doc(application)


@router.get("/", response_model=List[schemas.LoanApplication])
async def read_loan_applications(
    skip: int = 0,
    limit: int = 100,
    db: Database = Depends(get_db),
):
    applications = list(db.loan_applications.find().skip(skip).limit(limit))
    for app in applications:
        app["documents"] = []
    return [serialize_doc(app) for app in applications]
