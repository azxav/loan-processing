from datetime import datetime

# pyright: reportMissingImports=false

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from pymongo.database import Database

from backend.app.core.database import get_db
from backend.app.core.mongo_utils import serialize_doc, to_object_id
from backend.app.schemas import schemas
from backend.app.services.ocr_service import ocr_service

router = APIRouter()


async def process_document_task(document_id: str, db: Database):
    try:
        oid = to_object_id(document_id)
    except ValueError:
        return

    document = db.documents.find_one({"_id": oid})
    if not document:
        return

    result = await ocr_service.process(document["file_path"], document["document_type"])
    db.documents.update_one(
        {"_id": oid}, {"$set": {"extracted_data": result, "is_verified": True}}
    )


@router.post("/upload", response_model=schemas.Document)
async def upload_document(
    background_tasks: BackgroundTasks,
    application_id: str = Form(...),
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: Database = Depends(get_db),
):
    file_location = f"uploads/{file.filename}"
    now = datetime.utcnow()

    doc_payload = {
        "application_id": application_id,
        "document_type": document_type,
        "file_path": file_location,
        "is_verified": False,
        "created_at": now,
        "extracted_data": None,
    }
    insert_result = db.documents.insert_one(doc_payload)
    stored = db.documents.find_one({"_id": insert_result.inserted_id})
    if not stored:
        raise HTTPException(status_code=500, detail="Could not store document")

    background_tasks.add_task(process_document_task, str(insert_result.inserted_id), db)
    
    return serialize_doc(stored)


@router.get("/{document_id}", response_model=schemas.Document)
async def read_document(
    document_id: str,
    db: Database = Depends(get_db),
):
    try:
        oid = to_object_id(document_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Document not found")

    document = db.documents.find_one({"_id": oid})
    if document is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return serialize_doc(document)
