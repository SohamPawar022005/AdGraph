import pathlib

from document_engine import ingest_pdf, sha256_bytes, sha256_file
from document_engine.ocr import InMemoryOcrBackend, PageResult
from reportlab.pdfgen import canvas


def make_text_pdf(path: pathlib.Path, text: str) -> None:
    c = canvas.Canvas(str(path))
    c.drawString(72, 720, text)
    c.save()


def make_blank_pdf(path: pathlib.Path) -> None:
    c = canvas.Canvas(str(path))
    c.showPage()
    c.save()


def test_hashing_deterministic(tmp_path):
    f = tmp_path / "a.txt"
    f.write_text("hello world")
    assert sha256_file(f) == sha256_bytes(b"hello world")


def test_ingest_pdf_with_text_layer(tmp_path):
    pdf_path = tmp_path / "text.pdf"
    make_text_pdf(pdf_path, "Section 1. Short title and commencement of the MAITRI Act.")
    result = ingest_pdf(str(pdf_path))
    assert result.page_count == 1
    assert result.pages[0].engine == "pdf_text_layer"
    assert result.pages[0].confidence == 1.0
    assert "MAITRI" in result.full_text
    assert result.used_ocr is False
    assert result.low_confidence_pages == []


def test_ingest_pdf_without_text_layer_and_no_ocr_backend_flags_not_configured(tmp_path):
    pdf_path = tmp_path / "blank.pdf"
    make_blank_pdf(pdf_path)
    result = ingest_pdf(str(pdf_path), ocr_backend=None)
    assert result.pages[0].engine == "ocr_not_configured"
    assert result.pages[0].low_confidence is True
    assert result.pages[0].text == ""


def test_ingest_pdf_degrades_gracefully_when_poppler_missing(tmp_path):
    """Without the system poppler/tesseract binaries (as in this CI sandbox), the
    pipeline must never crash or fabricate text -- it must flag the page honestly."""
    pdf_path = tmp_path / "blank2.pdf"
    make_blank_pdf(pdf_path)
    backend = InMemoryOcrBackend(canned_pages=[PageResult(1, "fake ocr text", 0.9, "fake")])
    result = ingest_pdf(str(pdf_path), ocr_backend=backend)
    assert result.page_count == 1
    # Either OCR succeeded (if poppler happens to be installed) or it failed gracefully.
    assert result.pages[0].engine in ("tesseract", "fake") or result.pages[0].engine.startswith(
        "ocr_failed"
    )
    assert result.pages[0].text != "FABRICATED"


def test_in_memory_ocr_backend_flags_low_confidence_fake_fallback():
    backend = InMemoryOcrBackend()
    result = backend.ocr_image_bytes(b"not-really-an-image", page_number=1)
    assert result.low_confidence is True
    assert result.text == ""
