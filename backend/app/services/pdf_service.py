"""PDF text extraction service using PyMuPDF."""
from __future__ import annotations
import io
import logging

logger = logging.getLogger(__name__)

MAX_TEXT_LENGTH = 15000


def extract_pdf_text(file_bytes: bytes) -> tuple[str, bool]:
    """
    Extract text from a PDF.
    Returns (extracted_text, is_scanned).
    Raises ValueError for corrupt files.
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise RuntimeError("PyMuPDF is not installed. Run: pip install pymupdf")

    try:
        doc = fitz.open(stream=io.BytesIO(file_bytes), filetype="pdf")
    except Exception as e:
        raise ValueError(f"Could not open PDF: {e}")

    pages_text: list[str] = []
    for page_num in range(min(doc.page_count, 30)):  # limit to 30 pages
        page = doc.load_page(page_num)
        text = page.get_text("text")
        if text.strip():
            pages_text.append(text.strip())

    doc.close()

    combined = "\n\n".join(pages_text).strip()

    if not combined:
        return "", True  # likely scanned

    # Truncate to safe length
    if len(combined) > MAX_TEXT_LENGTH:
        combined = combined[:MAX_TEXT_LENGTH]
        logger.info("PDF text truncated to %d chars", MAX_TEXT_LENGTH)

    return combined, False
