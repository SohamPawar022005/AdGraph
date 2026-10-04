from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.workflow import Document
from ..services import document_service

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form(...),
    business_profile_id: Optional[str] = Form(None),
    application_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    content = await file.read()
    try:
        doc = document_service.ingest_document(
            db,
            filename=file.filename,
            content=content,
            document_type=document_type,
            business_profile_id=business_profile_id,
            application_id=application_id,
        )
    except document_service.UploadValidationError as exc:
        raise HTTPException(400, str(exc)) from exc
    return {
        "id": doc.id,
        "document_type": doc.document_type,
        "original_filename": doc.original_filename,
        "content_hash": doc.content_hash,
        "size_bytes": doc.size_bytes,
        "validation_status": doc.validation_status,
    }


@router.post("/{document_id}/validate")
def validate_document(document_id: str, extracted_fields: dict = {}, db: Session = Depends(get_db)):
    try:
        doc = document_service.validate_document(db, document_id, extracted_fields)
    except ValueError as exc:
        raise HTTPException(404, str(exc)) from exc
    return {
        "id": doc.id,
        "validation_status": doc.validation_status,
        "validation_errors": doc.validation_errors,
    }


def _doc_summary(doc: Document) -> dict:
    return {
        "id": doc.id,
        "document_type": doc.document_type,
        "original_filename": doc.original_filename,
        "size_bytes": doc.size_bytes,
        "validation_status": doc.validation_status,
        "is_synthetic": doc.is_synthetic,
        "business_profile_id": doc.business_profile_id,
        "application_id": doc.application_id,
        "created_at": doc.created_at,
    }


@router.get("")
def list_documents(
    limit: int = 50,
    offset: int = 0,
    business_profile_id: Optional[str] = None,
    application_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Document)
    if business_profile_id:
        query = query.filter(Document.business_profile_id == business_profile_id)
    if application_id:
        query = query.filter(Document.application_id == application_id)
    total = query.count()
    items = query.order_by(Document.created_at.desc()).offset(offset).limit(limit).all()
    return {"total": total, "items": [_doc_summary(d) for d in items]}


@router.get("/{document_id}")
def get_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(404, "Document not found")
    return {
        "id": doc.id,
        "document_type": doc.document_type,
        "original_filename": doc.original_filename,
        "content_hash": doc.content_hash,
        "size_bytes": doc.size_bytes,
        "validation_status": doc.validation_status,
        "validation_errors": doc.validation_errors,
        "is_synthetic": doc.is_synthetic,
    }
