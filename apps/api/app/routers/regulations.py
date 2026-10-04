from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..models.regulatory import RegulationVersion, Regulation, Section, SourceDocument

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
            "notes": d.notes,
        }
        for d in docs
    ]


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
