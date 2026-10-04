"""OCR backend abstraction (brief §17: "Use a reliable open-source OCR stack").

Default backend: Tesseract OCR via pytesseract + pdf2image (Apache-2.0 licensed,
offline, no network dependency -- see docs/research/technical-landscape.md).

The backend is injectable (`OcrBackend` protocol) so:
  (a) unit tests can run without the system `tesseract`/`poppler` binaries installed,
  (b) a future PaddleOCR/cloud backend can be swapped in without touching callers.

Per brief §17 ("never silently alter source text"): OCR output is always returned
alongside a `confidence` score and the literal recognised text is never corrected or
rewritten by this module. Any cleanup happens in a clearly-labelled downstream step
(AI candidate extraction), never here.
"""

from __future__ import annotations

import shutil
from dataclasses import dataclass
from typing import List, Protocol


class OcrUnavailableError(RuntimeError):
    """Raised when the configured OCR backend's system dependency is not installed."""


@dataclass
class PageResult:
    page_number: int
    text: str
    confidence: float  # 0..1 ; 1.0 for a native PDF text layer (not OCR)
    engine: str  # "pdf_text_layer" | "tesseract" | "fake"
    low_confidence: bool = False


class OcrBackend(Protocol):
    def ocr_image_bytes(self, image_bytes: bytes, page_number: int) -> PageResult:
        ...


LOW_CONFIDENCE_THRESHOLD = 0.60


class TesseractOcrBackend:
    """Real OCR backend. Requires the system `tesseract` binary (see docker/Dockerfile.api)."""

    def __init__(self, lang: str = "eng"):
        if shutil.which("tesseract") is None:
            raise OcrUnavailableError(
                "The 'tesseract' binary was not found on PATH. Install tesseract-ocr "
                "(see docker/Dockerfile.api or your OS package manager) to use "
                "TesseractOcrBackend, or inject a different OcrBackend for testing."
            )
        self.lang = lang

    def ocr_image_bytes(self, image_bytes: bytes, page_number: int) -> PageResult:
        import io

        import pytesseract
        from PIL import Image

        image = Image.open(io.BytesIO(image_bytes))
        data = pytesseract.image_to_data(
            image, lang=self.lang, output_type=pytesseract.Output.DICT
        )
        words = [w for w in data["text"] if w.strip()]
        confidences = [float(c) for c in data["conf"] if c not in ("-1", -1)]
        text = " ".join(words)
        avg_conf = (sum(confidences) / len(confidences) / 100.0) if confidences else 0.0
        return PageResult(
            page_number=page_number,
            text=text,
            confidence=round(avg_conf, 4),
            engine="tesseract",
            low_confidence=avg_conf < LOW_CONFIDENCE_THRESHOLD,
        )


class InMemoryOcrBackend:
    """Deterministic fake backend for tests and environments without tesseract/poppler.

    Not used for any real regulatory corpus text in this repository -- see
    docs/PROJECT-RESEARCH.md §19 "Limitations" for how the two scanned source Acts
    are handled when the real OCR backend / original scans are unavailable.
    """

    def __init__(self, canned_pages: List[PageResult] | None = None):
        self.canned_pages = canned_pages or []
        self._next = 0

    def ocr_image_bytes(self, image_bytes: bytes, page_number: int) -> PageResult:
        if self._next < len(self.canned_pages):
            result = self.canned_pages[self._next]
            self._next += 1
            return result
        return PageResult(
            page_number=page_number, text="", confidence=0.0, engine="fake", low_confidence=True
        )
