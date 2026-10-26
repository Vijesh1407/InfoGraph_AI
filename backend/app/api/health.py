"""Health check endpoint."""
import os
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    status: str
    llm_provider: str
    version: str


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="ok",
        llm_provider=os.getenv("LLM_PROVIDER", "demo"),
        version="1.0.0",
    )
