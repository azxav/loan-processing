from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models import models
from app.schemas import schemas
from app.services.ocr_service import ocr_service

router = APIRouter()

async def process_document_task(document_id: int, db: Session):
    # Simulate processing
    document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if document:
        # Call OCR service (mocked for now)
        result = await ocr_service.process(document.file_path, document.document_type)
        document.extracted_data = result
        document.is_verified = True
        db.commit()

@router.post("/upload", response_model=schemas.Document)
async def upload_document(
    background_tasks: BackgroundTasks,
    application_id: int = Form(...),
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # In a real app, we would save the file to S3/disk here
    file_location = f"uploads/{file.filename}"
    
    db_document = models.Document(
        application_id=application_id,
        document_type=document_type,
        file_path=file_location,
        is_verified=False
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    
    # Add background task
    background_tasks.add_task(process_document_task, db_document.id, db)
    
    return db_document

@router.get("/{document_id}", response_model=schemas.Document)
def read_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    db_document = db.query(models.Document).filter(models.Document.id == document_id).first()
    if db_document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return db_document
