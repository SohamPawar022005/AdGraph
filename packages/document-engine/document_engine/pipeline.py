"""End-to-end document ingestion pipeline (brief §16).

upload -> (object storage, handled by apps/api) -> file validation (handled by
apps/api) -> this module: hashing -> text-layer extraction -> OCR fallback for
pages without a usable text layer -> page/line provenance preserved.

This module never silently alters recognised text and never fabricates content for
pages it cannot read -- unreadable pages are reported with `engine="unreadable"` and
`low_confidence=True`, never dropped silently.
"""

from __future__ import annotations

import io
from dataclasses import dataclass, field
from typing import List, Optional

from pypdf import PdfReader

from .hashing import sha256_file
from .ocr import OcrBackend, PageResult

MIN_TEXT_LAYER_CHARS = 20


@dataclass
class IngestResult:
    file_path: str
    content_hash: str
    page_count: int
    pages: List[PageResult] = field(default_factory=list)
    used_ocr: bool = False
    low_confidence_pages: List[int] = field(default_factory=list)

    @property
    def full_text(self) -> str:
        return "\n\n".join(p.text for p in self.pages)


class DocumentProcessingError(Exception):
    """Raised when a document cannot be processed due to corruption, unreadable format, or unsupported type."""
    pass


def ingest_pdf(file_path: str, ocr_backend: Optional[OcrBackend] = None, dpi: int = 200) -> IngestResult:
    """Ingest a PDF: extract any native text layer; OCR pages that lack one.

    If `ocr_backend` is None, pages without a usable text layer are reported as
    `engine="ocr_not_configured"` with empty text and low_confidence=True, rather than
    silently fabricating or skipping them.
    """
    try:
        content_hash = sha256_file(file_path)
    except Exception as exc:
        raise DocumentProcessingError(f"Unable to read file for hashing: {exc}") from exc

    try:
        reader = PdfReader(file_path)
        if len(reader.pages) == 0:
            raise DocumentProcessingError("PDF document contains 0 pages or is empty.")
    except DocumentProcessingError:
        raise
    except Exception as exc:
        raise DocumentProcessingError(f"Malformed or unreadable PDF document: {exc}") from exc

    pages: List[PageResult] = []
    used_ocr = False

    needs_ocr_page_numbers: List[int] = []
    for i, page in enumerate(reader.pages, start=1):
        try:
            text = (page.extract_text() or "").strip()
        except Exception:
            text = ""
        if len(text) >= MIN_TEXT_LAYER_CHARS:
            pages.append(
                PageResult(page_number=i, text=text, confidence=1.0, engine="pdf_text_layer")
            )
        else:
            pages.append(None)  # placeholder, filled below
            needs_ocr_page_numbers.append(i)

    if needs_ocr_page_numbers:
        if ocr_backend is not None:
            try:
                from pdf2image import convert_from_path

                images = convert_from_path(
                    file_path,
                    dpi=dpi,
                    first_page=min(needs_ocr_page_numbers),
                    last_page=max(needs_ocr_page_numbers),
                )
                image_by_page = {
                    p: img
                    for p, img in zip(
                        range(min(needs_ocr_page_numbers), max(needs_ocr_page_numbers) + 1), images
                    )
                }
                for page_number in needs_ocr_page_numbers:
                    img = image_by_page.get(page_number)
                    if img is None:
                        pages[page_number - 1] = PageResult(
                            page_number=page_number, text="", confidence=0.0,
                            engine="unreadable", low_confidence=True,
                        )
                        continue
                    buf = io.BytesIO()
                    img.save(buf, format="PNG")
                    result = ocr_backend.ocr_image_bytes(buf.getvalue(), page_number)
                    pages[page_number - 1] = result
                    used_ocr = True
            except Exception as exc:  # pragma: no cover - depends on system deps
                for page_number in needs_ocr_page_numbers:
                    pages[page_number - 1] = PageResult(
                        page_number=page_number,
                        text="",
                        confidence=0.0,
                        engine=f"ocr_failed: {exc.__class__.__name__}",
                        low_confidence=True,
                    )
        else:
            for page_number in needs_ocr_page_numbers:
                pages[page_number - 1] = PageResult(
                    page_number=page_number,
                    text="",
                    confidence=0.0,
                    engine="ocr_not_configured",
                    low_confidence=True,
                )

    low_confidence_pages = [p.page_number for p in pages if p.low_confidence]

    return IngestResult(
        file_path=file_path,
        content_hash=content_hash,
        page_count=len(pages),
        pages=pages,
        used_ocr=used_ocr,
        low_confidence_pages=low_confidence_pages,
    )


def ingest_text_file(file_path: str) -> IngestResult:
    """Ingest a plain text, markdown, or JSON document."""
    try:
        content_hash = sha256_file(file_path)
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
    except Exception as exc:
        raise DocumentProcessingError(f"Failed to read text document: {exc}") from exc

    lines = content.splitlines()
    # Chunk into pages roughly every 50 lines or form-feed characters
    page_texts: List[str] = []
    if "\x0c" in content:
        page_texts = [p.strip() for p in content.split("\x0c") if p.strip()]
    if not page_texts:
        chunk_size = 50
        page_texts = [
            "\n".join(lines[i : i + chunk_size]).strip()
            for i in range(0, max(len(lines), 1), chunk_size)
            if "\n".join(lines[i : i + chunk_size]).strip()
        ]
    if not page_texts:
        page_texts = [content.strip() or ""]

    pages = [
        PageResult(
            page_number=idx,
            text=pt,
            confidence=1.0,
            engine="text_file_layer",
            low_confidence=False,
        )
        for idx, pt in enumerate(page_texts, start=1)
    ]

    return IngestResult(
        file_path=file_path,
        content_hash=content_hash,
        page_count=len(pages),
        pages=pages,
        used_ocr=False,
        low_confidence_pages=[],
    )


def ingest_document_file(
    file_path: str, ocr_backend: Optional[OcrBackend] = None, dpi: int = 200
) -> IngestResult:
    """Ingest any supported document (.pdf, .txt, .md, .json) with error reporting."""
    p = str(file_path).lower()
    if p.endswith(".pdf"):
        return ingest_pdf(file_path, ocr_backend=ocr_backend, dpi=dpi)
    elif p.endswith((".txt", ".md", ".json")):
        return ingest_text_file(file_path)
    else:
        raise DocumentProcessingError(
            f"Unsupported document format for '{file_path}'. Supported extensions: .pdf, .txt, .md, .json"
        )

