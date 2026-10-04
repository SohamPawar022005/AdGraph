from __future__ import annotations

import pathlib
from typing import List, Optional

from document_engine import sha256_bytes
from sqlalchemy.orm import Session

from ..core.config import get_settings
from ..models.audit import AuditEvent
from ..models.workflow import Document

settings = get_settings()


class UploadValidationError(Exception):
    pass


def validate_upload(filename: str, content: bytes) -> None:
    ext = pathlib.Path(filename).suffix.lower()
    if ext not in settings.allowed_upload_extensions:
        raise UploadValidationError(
            f"File type '{ext}' not allowed. Allowed: {settings.allowed_upload_extensions}"
        )
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.max_upload_size_mb:
        raise UploadValidationError(
            f"File too large ({size_mb:.1f} MB); max is {settings.max_upload_size_mb} MB"
        )


def store_local(filename: str, content: bytes) -> str:
    directory = pathlib.Path(settings.local_storage_dir)
    directory.mkdir(parents=True, exist_ok=True)
    digest = sha256_bytes(content)[:16]
    safe_name = f"{digest}_{pathlib.Path(filename).name}"
    path = directory / safe_name
    path.write_bytes(content)
    return str(path)


def ingest_document(
    db: Session,
    filename: str,
    content: bytes,
    document_type: str,
    business_profile_id: Optional[str] = None,
    application_id: Optional[str] = None,
    is_synthetic: bool = True,
) -> Document:
    validate_upload(filename, content)
    storage_key = store_local(filename, content)
    doc = Document(
        business_profile_id=business_profile_id,
        application_id=application_id,
        document_type=document_type,
        original_filename=filename,
        storage_key=storage_key,
        content_hash=sha256_bytes(content),
        size_bytes=len(content),
        validation_status="pending",
        is_synthetic=is_synthetic,
    )
    db.add(doc)
    db.flush()
    db.add(
        AuditEvent(
            event_type="DOCUMENT_UPLOADED",
            entity_type="document",
            entity_id=doc.id,
            actor="system",
            new_value={"filename": filename, "document_type": document_type},
        )
    )
    db.commit()
    db.refresh(doc)
    return doc


REQUIRED_FIELDS_BY_TYPE = {
    "processing_fee_receipt": ["amount", "payment_date", "application_reference"],
    "identity_proof": ["holder_name", "id_number"],
    "project_report": ["project_title", "investment_amount"],
}


def validate_document(db: Session, document_id: str, extracted_fields: Optional[dict] = None) -> Document:
    """Deterministic structural validation (brief §16, §30 `/documents/{id}/validate`).

    This is intentionally rule-based, not an AI "confidence score" -- it checks file
    integrity (hash still matches stored bytes) and presence of document-type-specific
    required fields, exactly as declared in REQUIRED_FIELDS_BY_TYPE, and nothing more.
    """
    doc = db.get(Document, document_id)
    if doc is None:
        raise ValueError(f"Document '{document_id}' not found")

    errors: List[str] = []
    path = pathlib.Path(doc.storage_key)
    if not path.exists():
        errors.append("STORED_FILE_MISSING")
    else:
        actual_hash = sha256_bytes(path.read_bytes())
        if actual_hash != doc.content_hash:
            errors.append("CONTENT_HASH_MISMATCH")

    required = REQUIRED_FIELDS_BY_TYPE.get(doc.document_type, [])
    fields = extracted_fields or {}
    for field in required:
        if not fields.get(field):
            errors.append(f"MISSING_REQUIRED_FIELD:{field}")

    doc.validation_status = "valid" if not errors else "invalid"
    doc.validation_errors = errors
    db.add(
        AuditEvent(
            event_type="DOCUMENT_VALIDATED",
            entity_type="document",
            entity_id=doc.id,
            actor="system",
            new_value={"validation_status": doc.validation_status, "errors": errors},
        )
    )
    db.commit()
    db.refresh(doc)
    return doc
