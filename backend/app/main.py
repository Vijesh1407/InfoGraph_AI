"""InfoGraph AI – FastAPI backend entry point."""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from dotenv import load_dotenv

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

from app.api import health, infographics  # noqa: E402 (after load_dotenv)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="InfoGraph AI API",
    description="Intelligent Text-to-Infographic Generator",
    version="1.0.0",
    lifespan=lifespan,
)

origins = [
    os.getenv("FRONTEND_ORIGIN", "http://localhost:5173"),
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "InfoGraph AI API is running", "docs": "/docs"}

@app.get("/health")
async def top_health():
    return {"status": "ok", "llm_provider": os.getenv("LLM_PROVIDER", "demo"), "version": "1.0.0"}

app.include_router(health.router, prefix="/api/v1")
app.include_router(infographics.router, prefix="/api/v1")
