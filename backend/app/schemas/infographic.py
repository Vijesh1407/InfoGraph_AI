"""Pydantic schemas for infographic data structures."""
from __future__ import annotations
from typing import Literal, Optional, Union
from pydantic import BaseModel, Field


# ── Request ───────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    text: str = Field(..., min_length=10, max_length=15000)
    format: Literal["auto", "process", "timeline", "comparison", "concept_map"] = "auto"
    theme: Optional[str] = "default"


# ── Process infographic ───────────────────────────────────────────────────────

class ProcessStep(BaseModel):
    step_number: int
    title: str
    description: str


class ProcessInfographic(BaseModel):
    type: Literal["process"] = "process"
    title: str
    subtitle: str
    steps: list[ProcessStep] = Field(..., min_length=2, max_length=10)
    summary: Optional[str] = None


# ── Timeline infographic ──────────────────────────────────────────────────────

class TimelineEvent(BaseModel):
    label: str
    date: Optional[str] = None
    description: str


class TimelineInfographic(BaseModel):
    type: Literal["timeline"] = "timeline"
    title: str
    subtitle: str
    events: list[TimelineEvent] = Field(..., min_length=2, max_length=10)
    summary: Optional[str] = None


# ── Comparison infographic ────────────────────────────────────────────────────

class ComparisonAttribute(BaseModel):
    attribute: str
    values: dict[str, str]  # item_name -> value


class ComparisonItem(BaseModel):
    name: str
    description: str


class ComparisonInfographic(BaseModel):
    type: Literal["comparison"] = "comparison"
    title: str
    subtitle: str
    items: list[ComparisonItem] = Field(..., min_length=2, max_length=5)
    attributes: list[ComparisonAttribute] = Field(..., min_length=1, max_length=10)
    summary: Optional[str] = None


# ── Concept Map / Overview infographic ────────────────────────────────────────

class ConceptSubtopic(BaseModel):
    id: str
    name: str
    description: str
    relationship_to_main: Optional[str] = None
    connected_to: list[str] = Field(default_factory=list)


class ConceptMapInfographic(BaseModel):
    type: Literal["concept_map"] = "concept_map"
    title: str
    subtitle: str
    main_concept: str
    subtopics: list[ConceptSubtopic] = Field(..., min_length=2, max_length=10)
    summary: Optional[str] = None


# ── Union type ────────────────────────────────────────────────────────────────

InfographicData = Union[
    ProcessInfographic,
    TimelineInfographic,
    ComparisonInfographic,
    ConceptMapInfographic,
]


# ── Response ──────────────────────────────────────────────────────────────────

class GenerateResponse(BaseModel):
    success: bool
    data: Optional[InfographicData] = None
    format_used: Optional[str] = None
    is_demo: bool = False
    demo_notice: Optional[str] = None
    error: Optional[str] = None
    # Real AI Image Generation fields
    image_url: Optional[str] = None
    image_b64: Optional[str] = None
    image_prompt: Optional[str] = None
    image_provider: Optional[str] = None
    image_model: Optional[str] = None
    image_status: Optional[str] = None
    image_error: Optional[str] = None
    image_metadata: Optional[dict] = None


class RegenerateImageRequest(BaseModel):
    prompt: str = Field(..., min_length=10)
    category: str = "process"
    theme: Optional[str] = "default"

