import pathlib
import re
from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from document_engine import DocumentProcessingError, ingest_document_file
from regulatory_parser import extract_candidates, split_into_sections

from ..db import get_db
from ..models.audit import AuditEvent
from ..models.regulatory import Clause, Regulation, RegulationVersion, Rule, RuleVersion, Section, SourceDocument
from ..services import change_service


router = APIRouter(prefix="/api/v1/regulations", tags=["regulations"])


def _version_payload(rv: RegulationVersion) -> dict:
    return {
        "id": rv.id,
        "regulation_id": rv.regulation_id,
        "version_label": rv.version_label,
        "effective_from": rv.effective_from,
        "effective_to": rv.effective_to,
        "status": rv.status,
        "verification_status": rv.verification_status,
        "source_document_id": rv.source_document_id,
        "source_url": rv.source_url,
        "section_count": len(rv.sections),
    }


@router.get("")
def list_regulations(db: Session = Depends(get_db)):
    regs = db.query(Regulation).all()
    out = []
    for r in regs:
        out.append(
            {
                "id": r.id,
                "name": r.name,
                "short_code": r.short_code,
                "jurisdiction": r.jurisdiction,
                "versions": [_version_payload(v) for v in r.versions],
            }
        )
    return out


@router.get("/source-documents/list")
def list_source_documents(db: Session = Depends(get_db)):
    docs = db.query(SourceDocument).all()
    return [
        {
            "id": d.id,
            "title": d.title,
            "jurisdiction": d.jurisdiction,
            "version_label": d.version_label,
            "content_hash": d.content_hash,
            "source_url": d.source_url,
            "ocr_status": d.ocr_status,
            "page_count": getattr(d, "page_count", 1),
            "notes": d.notes,
        }
        for d in docs
    ]


@router.get("/source-documents/{doc_id}")
def get_source_document(doc_id: str, db: Session = Depends(get_db)):
    d = db.get(SourceDocument, doc_id)
    if d is None:
        raise HTTPException(404, f"SourceDocument '{doc_id}' not found")
    
    sections = []
    if d.regulations:
        for rv in d.regulations:
            for s in sorted(rv.sections, key=lambda sec: _section_sort_key(sec.number)):
                sections.append({
                    "id": s.id,
                    "number": s.number,
                    "heading": s.heading,
                    "text": s.text,
                    "preview": (s.text[:140] + "...") if len(s.text) > 140 else s.text,
                })
    return {
        "id": d.id,
        "title": d.title,
        "jurisdiction": d.jurisdiction,
        "authority": d.authority,
        "document_type": d.document_type,
        "version_label": d.version_label,
        "content_hash": d.content_hash,
        "source_url": d.source_url,
        "file_type": d.file_type,
        "ocr_status": d.ocr_status,
        "page_count": getattr(d, "page_count", 1),
        "notes": d.notes,
        "created_at": d.created_at,
        "raw_text_preview": (d.raw_text[:600] + "...") if d.raw_text and len(d.raw_text) > 600 else d.raw_text,
        "sections": sections,
    }


class CompareSourceDocsRequest(BaseModel):
    old_document_id: str
    new_document_id: str
    is_synthetic: bool = False


@router.post("/compare-source-documents")
def compare_source_documents(payload: CompareSourceDocsRequest, db: Session = Depends(get_db)):
    """Compare two stored regulatory documents and persist detected changes and impacts."""
    doc_old = db.get(SourceDocument, payload.old_document_id)
    if doc_old is None:
        raise HTTPException(404, f"Old SourceDocument '{payload.old_document_id}' not found")
    doc_new = db.get(SourceDocument, payload.new_document_id)
    if doc_new is None:
        raise HTTPException(404, f"New SourceDocument '{payload.new_document_id}' not found")

    def _get_sections_dict(doc: SourceDocument) -> dict[str, str]:
        sections_dict = {}
        if doc.regulations:
            for rv in doc.regulations:
                for s in rv.sections:
                    label = f"Section {s.number}" if not s.number.lower().startswith("section") else s.number
                    sections_dict[label] = s.text
        if not sections_dict and doc.raw_text:
            parsed = split_into_sections(doc.raw_text)
            for p in parsed:
                sections_dict[f"Section {p.number}"] = p.text
        if not sections_dict and doc.raw_text:
            sections_dict["Section 1"] = doc.raw_text
        return sections_dict

    old_sections = _get_sections_dict(doc_old)
    new_sections = _get_sections_dict(doc_new)

    changes = change_service.analyze_and_persist(
        db,
        old_sections=old_sections,
        new_sections=new_sections,
        old_source_document_id=doc_old.id,
        new_source_document_id=doc_new.id,
        is_synthetic=payload.is_synthetic,
    )

    from .regulatory_changes import _payload
    return [_payload(c) for c in changes]


@router.post("/source-documents/upload")
async def upload_source_document(
    file: UploadFile = File(...),
    title: str = Form(...),
    jurisdiction: str = Form("Maharashtra"),
    authority: str = Form(""),
    document_type: str = Form("Act"),
    version_label: str = Form("v1"),
    regulation_short_code: str = Form(""),
    db: Session = Depends(get_db),
):
    """Upload and ingest a real or amended regulatory document (.pdf, .txt, .md, .json)."""
    allowed_exts = {".pdf", ".txt", ".md", ".json"}
    ext = pathlib.Path(file.filename).suffix.lower()
    if ext not in allowed_exts:
        raise HTTPException(
            400,
            f"Unsupported file extension '{ext}'. Allowed extensions are: {', '.join(sorted(allowed_exts))}",
        )

    content = await file.read()
    if not content:
        raise HTTPException(400, "Uploaded file is empty.")

    # Save to data/uploads
    upload_dir = pathlib.Path("data/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-") or "doc"
    clean_version = re.sub(r"[^a-z0-9]+", "-", version_label.lower()).strip("-") or "v1"
    doc_id = f"{slug}-{clean_version}"

    # Ensure uniqueness if doc_id exists
    existing = db.get(SourceDocument, doc_id)
    if existing:
        doc_id = f"{doc_id}-{int(datetime.now(timezone.utc).timestamp())}"

    file_save_path = upload_dir / f"{doc_id}{ext}"
    file_save_path.write_bytes(content)

    # Ingest document
    try:
        ingest_res = ingest_document_file(str(file_save_path))
    except DocumentProcessingError as exc:
        raise HTTPException(400, f"Document processing failed: {exc}") from exc
    except Exception as exc:
        raise HTTPException(400, f"Failed to ingest document: {exc}") from exc

    raw_text = ingest_res.full_text
    parsed_sections = split_into_sections(raw_text)

    # Determine OCR status
    ocr_status = "extracted_native"
    if ingest_res.used_ocr:
        ocr_status = "ocr_completed"
    elif ingest_res.low_confidence_pages:
        ocr_status = f"low_confidence_pages_{len(ingest_res.low_confidence_pages)}"

    source_doc = SourceDocument(
        id=doc_id,
        title=title,
        jurisdiction=jurisdiction,
        authority=authority or None,
        document_type=document_type,
        version_label=version_label,
        content_hash=ingest_res.content_hash,
        file_type=ext.lstrip("."),
        ocr_status=ocr_status,
        notes=f"Uploaded {file.filename}; extracted {len(parsed_sections)} section(s) across {ingest_res.page_count} page(s).",
        raw_text=raw_text,
        page_count=ingest_res.page_count,
        pages_metadata=[{"page": p.page_number, "confidence": p.confidence, "engine": p.engine} for p in ingest_res.pages],
        file_path=str(file_save_path),
    )
    db.add(source_doc)
    db.flush()

    # Create or find Regulation
    short_code = regulation_short_code.strip() or slug[:20].upper()
    reg = db.query(Regulation).filter(Regulation.short_code == short_code).first()
    if not reg:
        reg = Regulation(name=title, short_code=short_code, jurisdiction=jurisdiction)
        db.add(reg)
        db.flush()

    # Create RegulationVersion
    reg_version = RegulationVersion(
        regulation_id=reg.id,
        version_label=version_label,
        effective_from=date.today(),
        status="candidate",
        verification_status="CANDIDATE",
        source_document_id=source_doc.id,
        source_url=None,
        extraction_method="OCR" if ingest_res.used_ocr else "OFFICIAL_TEXT_MIRROR",
        confidence=1.0 if not ingest_res.used_ocr else 0.8,
    )
    db.add(reg_version)
    db.flush()

    # Create Sections and Candidate Rules
    candidate_rules_count = 0
    if not parsed_sections and raw_text.strip():
        # Fallback to single section if no numbered headings matched
        parsed_sections = [
            type("FallbackSection", (), {
                "number": "1",
                "heading": "General Provisions",
                "text": raw_text.strip(),
            })()
        ]

    for s in parsed_sections:
        sec = Section(
            regulation_version_id=reg_version.id,
            number=str(s.number),
            heading=getattr(s, "heading", None),
            text=s.text,
            source_document_id=source_doc.id,
            source_section=f"Section {s.number}",
            extraction_method="OCR" if ingest_res.used_ocr else "OFFICIAL_TEXT_MIRROR",
            confidence=1.0 if not ingest_res.used_ocr else 0.8,
            verification_status="CANDIDATE",
        )
        db.add(sec)
        db.flush()

        candidates = extract_candidates(s.text)
        obligations = [c.text for c in candidates if c.kind == "obligation"]
        if obligations:
            rule_id = f"RULE-CANDIDATE-{doc_id}-{s.number}"
            existing_rule = db.get(Rule, rule_id)
            if not existing_rule:
                existing_rule = Rule(
                    id=rule_id,
                    name=f"Obligation under Section {s.number} of {title}",
                    jurisdiction=jurisdiction,
                )
                db.add(existing_rule)
                db.flush()

            rv = RuleVersion(
                rule_id=existing_rule.id,
                version=version_label,
                effective_from=date.today(),
                status="candidate",
                verification_status="CANDIDATE",
                rule_body={
                    "name": existing_rule.name,
                    "jurisdiction": jurisdiction,
                    "applies_when": {"field": "jurisdiction", "operator": "eq", "value": jurisdiction},
                    "requires": [{"approval": f"COMPLIANCE-{s.number}", "reason": ob} for ob in obligations[:3]],
                    "actions": [],
                },
                source_document_id=source_doc.id,
                source_section=f"Section {s.number}",
                extraction_method="AI_CANDIDATE",
                confidence=0.55,
            )

            db.add(rv)
            candidate_rules_count += 1

    db.add(
        AuditEvent(
            event_type="DOCUMENT_UPLOADED",
            entity_type="source_document",
            entity_id=source_doc.id,
            actor="system:upload",
            new_value={"title": title, "sections": len(parsed_sections), "file": file.filename},
        )
    )
    db.commit()

    return {
        "id": source_doc.id,
        "title": source_doc.title,
        "version_label": source_doc.version_label,
        "content_hash": source_doc.content_hash,
        "page_count": source_doc.page_count,
        "sections_extracted": len(parsed_sections),
        "candidate_rules_generated": candidate_rules_count,
        "ocr_status": source_doc.ocr_status,
        "regulation_id": reg.id,
        "regulation_version_id": reg_version.id,
    }


@router.get("/{regulation_id}")
def get_regulation(regulation_id: str, db: Session = Depends(get_db)):
    reg = db.get(Regulation, regulation_id)
    if reg is None:
        raise HTTPException(404, "Regulation not found")
    return {
        "id": reg.id,
        "name": reg.name,
        "short_code": reg.short_code,
        "jurisdiction": reg.jurisdiction,
        "versions": [
            {
                **_version_payload(v),
                "sections": [
                    {"id": s.id, "number": s.number, "heading": s.heading, "text": s.text}
                    for s in sorted(v.sections, key=lambda s: _section_sort_key(s.number))
                ],
            }
            for v in reg.versions
        ],
    }


def _section_sort_key(number: str):
    digits = "".join(ch for ch in number if ch.isdigit()) or "0"
    return (int(digits), number)

