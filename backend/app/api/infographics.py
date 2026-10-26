"""Infographic generation API endpoints."""
from __future__ import annotations
import os
import logging
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.schemas.infographic import GenerateRequest, GenerateResponse
from app.services.llm_service import generate_infographic
from app.services.pdf_service import extract_pdf_text

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/infographics", tags=["Infographics"])

MAX_PDF_BYTES = int(os.getenv("MAX_PDF_SIZE_MB", "10")) * 1024 * 1024
MAX_TEXT_LENGTH = int(os.getenv("MAX_TEXT_LENGTH", "15000"))


@router.post("/generate", response_model=GenerateResponse)
async def generate(
    text: Optional[str] = Form(None),
    format: str = Form("auto"),
    theme: Optional[str] = Form("default"),
    file: Optional[UploadFile] = File(None),
):
    """Generate an infographic from text or a PDF file."""
    extracted_text = ""
    is_scanned = False

    # ── PDF extraction ──────────────────────────────────────────────────────
    if file is not None:
        content_type = file.content_type or ""
        if "pdf" not in content_type and not file.filename.lower().endswith(".pdf"):  # type: ignore
            raise HTTPException(status_code=400, detail="Only PDF files are accepted.")
        pdf_bytes = await file.read()
        if len(pdf_bytes) > MAX_PDF_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"PDF exceeds {os.getenv('MAX_PDF_SIZE_MB', '10')} MB limit.",
            )
        try:
            extracted_text, is_scanned = extract_pdf_text(pdf_bytes)
        except (ValueError, RuntimeError) as e:
            raise HTTPException(status_code=422, detail=str(e))

        if is_scanned:
            raise HTTPException(
                status_code=422,
                detail=(
                    "This PDF appears to be scanned (image-based) and contains no "
                    "extractable text. OCR is not supported in this version. "
                    "Please upload a text-based PDF or paste the text directly."
                ),
            )

    # ── Merge text sources ──────────────────────────────────────────────────
    combined_text = ""
    if extracted_text:
        combined_text = extracted_text
    elif text:
        combined_text = text.strip()

    if not combined_text:
        raise HTTPException(status_code=400, detail="Provide either text or a PDF file.")

    if len(combined_text) > MAX_TEXT_LENGTH:
        combined_text = combined_text[:MAX_TEXT_LENGTH]

    if len(combined_text) < 30:
        raise HTTPException(status_code=400, detail="Input text is too short (minimum 30 characters).")

    # ── Validate format ──────────────────────────────────────────────────────
    valid_formats = {"auto", "process", "timeline", "comparison", "concept_map"}
    if format not in valid_formats:
        raise HTTPException(status_code=400, detail=f"Invalid format. Choose from: {valid_formats}")

    # ── Generate ─────────────────────────────────────────────────────────────
    try:
        data, is_demo, demo_notice = await generate_infographic(combined_text, format, theme)
    except RuntimeError as e:
        return JSONResponse(
            status_code=503,
            content=GenerateResponse(
                success=False,
                error=str(e),
            ).model_dump(),
        )
    except Exception as e:
        logger.exception("Unexpected error during generation")
        return JSONResponse(
            status_code=500,
            content=GenerateResponse(
                success=False,
                error=f"Internal error: {e}",
            ).model_dump(),
        )

    return GenerateResponse(
        success=True,
        data=data,
        format_used=data.type,
        is_demo=is_demo,
        demo_notice=demo_notice,
    )


@router.post("/extract-pdf")
async def extract_pdf(file: UploadFile = File(...)):
    """Extract and return text from a PDF without generating an infographic."""
    if "pdf" not in (file.content_type or "") and not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")
    pdf_bytes = await file.read()
    if len(pdf_bytes) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="PDF exceeds size limit.")
    try:
        text, is_scanned = extract_pdf_text(pdf_bytes)
    except (ValueError, RuntimeError) as e:
        raise HTTPException(status_code=422, detail=str(e))

    if is_scanned:
        return {"success": False, "is_scanned": True, "text": "", "char_count": 0}
    return {"success": True, "is_scanned": False, "text": text, "char_count": len(text)}
