from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter()

@router.post("/", response_model=schemas.LoanApplication)
def create_loan_application(
    application: schemas.LoanApplicationCreate,
    db: Session = Depends(get_db)
):
    db_application = models.LoanApplication(**application.model_dump())
    db.add(db_application)
    db.commit()
    db.refresh(db_application)
    return db_application

@router.get("/{application_id}", response_model=schemas.LoanApplication)
def read_loan_application(
    application_id: int,
    db: Session = Depends(get_db)
):
    db_application = db.query(models.LoanApplication).filter(models.LoanApplication.id == application_id).first()
    if db_application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    return db_application

@router.get("/", response_model=List[schemas.LoanApplication])
def read_loan_applications(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    applications = db.query(models.LoanApplication).offset(skip).limit(limit).all()
    return applications
