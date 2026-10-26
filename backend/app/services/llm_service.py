"""LLM service – supports Gemini Developer API, Ollama, OpenAI, and source-grounded Demo modes."""
from __future__ import annotations
import json
import os
import re
import logging
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
import httpx
from pydantic import ValidationError

from app.schemas.infographic import (
    ProcessInfographic, TimelineInfographic, ComparisonInfographic, ConceptMapInfographic,
    InfographicData,
)
from app.services.demo_service import generate_demo, classify_format

logger = logging.getLogger(__name__)

# Ensure backend/.env is reliably loaded relative to this file's location
ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)


def get_provider() -> str:
    return os.getenv("LLM_PROVIDER", "demo").lower().strip()


# ── System Prompt & Guidance ─────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert information architect and infographic designer.
Your task is to analyze the source text and transform it into a structured, highly accurate infographic JSON.

CRITICAL RULES:
1. GROUNDED IN TRUTH: Use ONLY facts, technical terms, concepts, numbers, and dates present in the source text.
2. NO HALLUCINATION: Never invent dates, years, statistics, claims, or events.
3. CONCISE & INFORMATIVE: Write clear, meaningful titles and informative descriptions. Do NOT truncate or cut off sentences mid-thought.
4. MEANINGFUL LABELS: Never use generic labels like "Step 1", "Option A", or "Event 1". Derive actual names from the content.
5. STRICT JSON ONLY: Respond with a single, valid JSON object matching the requested schema. No markdown fences, no explanatory text."""


def _build_prompt(text: str, fmt: str) -> str:
    if fmt == "auto":
        fmt = classify_format(text)

    schemas = {
        "process": """{
  "type": "process",
  "title": "string (concise, derived from actual process)",
  "subtitle": "string (informative summary tagline)",
  "steps": [
    {
      "step_number": 1,
      "title": "string (descriptive action or stage name from source)",
      "description": "string (clear, complete description of this stage, 1-2 sentences)"
    }
  ],
  "summary": "string or null (key takeaway or conclusion)"
}
Rules for process: 3 to 7 sequential steps reflecting the actual procedure in the source.""",

        "timeline": """{
  "type": "timeline",
  "title": "string (concise historical/chronological title)",
  "subtitle": "string (tagline summarizing the progression)",
  "events": [
    {
      "label": "string (meaningful name of the milestone or event)",
      "date": "string or null (exact year/date from source ONLY; if source has no dates, set to null)",
      "description": "string (concise description of what occurred)"
    }
  ],
  "summary": "string or null (chronological context or takeaway)"
}
Rules for timeline: 3 to 8 milestones in chronological order. NEVER invent dates.""",

        "comparison": """{
  "type": "comparison",
  "title": "string (e.g. 'Comparing X and Y')",
  "subtitle": "string (scope of comparison)",
  "items": [
    {"name": "string (actual subject name)", "description": "string (concise definition/role)"}
  ],
  "attributes": [
    {
      "attribute": "string (dimension of comparison, e.g. Data Type, Goal, Complexity)",
      "values": {"<item_name>": "string (specific grounded value for this subject)"}
    }
  ],
  "summary": "string or null (synthesis of main differences/tradeoffs)"
}
Rules for comparison: 2 to 4 real subjects, 2 to 6 grounded attributes with values for each subject.""",

        "concept_map": """{
  "type": "concept_map",
  "title": "string (clear conceptual title)",
  "subtitle": "string (tagline summarizing the system or domain)",
  "main_concept": "string (the central subject, model, or paradigm)",
  "subtopics": [
    {
      "id": "sub-1",
      "name": "string (meaningful component, module, or subconcept)",
      "description": "string (informative explanation of how this component works)",
      "relationship_to_main": "string (e.g. Consists of, Regulates, Optimizes, Governs, Implements)",
      "connected_to": ["sub-2"]
    }
  ],
  "summary": "string or null (overarching takeaway)"
}
Rules for concept map: 3 to 8 subtopics showing components, principles, or dimensions and how they relate.""",
    }

    schema = schemas.get(fmt, schemas["concept_map"])
    return f"""Analyze the source text and generate a structured {fmt} infographic JSON.

REQUIRED JSON SCHEMA:
{schema}

SOURCE TEXT:
{text[:12000]}

Respond ONLY with the JSON object."""


# ── JSON extraction ────────────────────────────────────────────────────────────

def _extract_json(raw: str) -> dict:
    raw = raw.strip()
    # Strip markdown code fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    raw = raw.strip()

    # Find the outermost JSON object
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in LLM response")
    return json.loads(raw[start:end + 1])


def _parse_infographic(data: dict) -> InfographicData:
    t = data.get("type", "process")
    if t == "process":
        return ProcessInfographic.model_validate(data)
    elif t == "timeline":
        return TimelineInfographic.model_validate(data)
    elif t == "comparison":
        return ComparisonInfographic.model_validate(data)
    elif t == "concept_map":
        return ConceptMapInfographic.model_validate(data)
    raise ValueError(f"Unknown infographic type: {t}")


# ── Provider implementations ────────────────────────────────────────────────────

async def _call_gemini(prompt: str, system: str) -> str:
    """Execute request against official Google Gemini API using httpx."""
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()

    if not api_key or api_key == "your_gemini_api_key_here":
        raise ValueError("GEMINI_API_KEY is not configured in backend/.env")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    headers = {
        "x-goog-api-key": api_key,
        "Content-Type": "application/json",
    }
    payload = {
        "system_instruction": {"parts": [{"text": system}]},
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 3072,
            "responseMimeType": "application/json",
        },
    }

    async with httpx.AsyncClient(timeout=35.0) as client:
        resp = await client.post(url, headers=headers, json=payload)
        status = resp.status_code

        if status != 200:
            # Handle specific error scenarios without leaking secret
            safe_detail = ""
            try:
                err_json = resp.json().get("error", {})
                safe_detail = err_json.get("message", "")
                if api_key in safe_detail:
                    safe_detail = safe_detail.replace(api_key, "[REDACTED]")
            except Exception:
                safe_detail = resp.text[:100]

            if status in (401, 403):
                raise RuntimeError("Invalid or unauthorized Gemini API key.")
            elif status == 429:
                raise RuntimeError("Gemini free-tier quota or rate limit exceeded.")
            elif status == 404:
                raise RuntimeError(f"Gemini model '{model}' not found.")
            else:
                raise RuntimeError(f"Gemini API HTTP {status}: {safe_detail}")

        data = resp.json()
        candidates = data.get("candidates", [])
        if not candidates:
            feedback = data.get("promptFeedback", {})
            reason = feedback.get("blockReason", "Content generation returned no candidates.")
            raise ValueError(f"Gemini returned no candidates ({reason})")

        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts or "text" not in parts[0]:
            raise ValueError("Gemini response missing text parts")

        return parts[0]["text"]


async def _call_ollama(prompt: str, system: str) -> str:
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
    model = os.getenv("OLLAMA_MODEL", "llama3.2")
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{base_url}/api/generate",
            json={
                "model": model,
                "prompt": f"{system}\n\n{prompt}",
                "stream": False,
                "format": "json",
            },
        )
        resp.raise_for_status()
        return resp.json()["response"]


async def _call_openai(prompt: str, system: str) -> str:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
    if not api_key or api_key == "your_openai_api_key_here":
        raise ValueError("OPENAI_API_KEY is not configured in backend/.env")

    async with httpx.AsyncClient(timeout=45) as client:
        resp = await client.post(
            f"{base_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt},
                ],
                "temperature": 0.1,
                "max_tokens": 3072,
                "response_format": {"type": "json_object"},
            },
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


# ── Main Generation Orchestrator ─────────────────────────────────────────────

async def generate_infographic(
    text: str, fmt: str, theme: Optional[str] = None
) -> tuple[InfographicData, bool, Optional[str]]:
    """
    Generate structured infographic content.
    Returns (data, is_demo, demo_notice).
    """
    provider = get_provider()
    actual_fmt = fmt if fmt != "auto" else classify_format(text)

    # 1. Intentional Demo Mode
    if provider == "demo":
        data = generate_demo(text, actual_fmt)
        return data, True, None

    # 2. Check credentials early for Gemini / OpenAI
    if provider == "gemini":
        key = os.getenv("GEMINI_API_KEY", "").strip()
        if not key or key == "your_gemini_api_key_here":
            logger.warning("Gemini provider selected but GEMINI_API_KEY is missing or default. Falling back to extractive demo.")
            data = generate_demo(text, actual_fmt)
            return data, True, "Gemini API key is not configured. Displaying source-grounded extractive fallback."

    if provider == "openai":
        key = os.getenv("OPENAI_API_KEY", "").strip()
        if not key or key == "your_openai_api_key_here":
            logger.warning("OpenAI provider selected but OPENAI_API_KEY is missing. Falling back to extractive demo.")
            data = generate_demo(text, actual_fmt)
            return data, True, "OpenAI API key is not configured. Displaying source-grounded extractive fallback."

    current_prompt = _build_prompt(text, actual_fmt)

    async def _execute_provider(prompt_to_send: str) -> str:
        if provider == "gemini":
            return await _call_gemini(prompt_to_send, SYSTEM_PROMPT)
        elif provider == "openai":
            return await _call_openai(prompt_to_send, SYSTEM_PROMPT)
        elif provider == "ollama":
            return await _call_ollama(prompt_to_send, SYSTEM_PROMPT)
        else:
            raise ValueError(f"Unknown LLM_PROVIDER '{provider}'. Must be 'gemini', 'demo', 'openai', or 'ollama'.")

    last_error: Optional[Exception] = None

    # 2 attempts: attempt 0 is initial prompt, attempt 1 includes validation error feedback
    for attempt in range(2):
        try:
            prompt_to_send = current_prompt
            if attempt > 0 and last_error:
                # Add validation feedback for bounded recovery retry
                prompt_to_send = (
                    f"{current_prompt}\n\nIMPORTANT: Previous attempt returned invalid JSON: {last_error}.\n"
                    f"Please correct the JSON format strictly according to the required schema."
                )

            raw_response = await _execute_provider(prompt_to_send)
            parsed = _extract_json(raw_response)
            if "type" not in parsed:
                parsed["type"] = actual_fmt

            data = _parse_infographic(parsed)
            # Successfully generated with genuine AI!
            return data, False, None

        except (ValidationError, ValueError, json.JSONDecodeError) as e:
            logger.warning("LLM output validation error on attempt %d: %s", attempt + 1, e)
            last_error = e
        except RuntimeError as e:
            # Fatal provider error (e.g. 401 unauthenticated, 429 quota exhausted)
            logger.warning("LLM provider runtime error: %s", e)
            last_error = e
            break
        except httpx.HTTPStatusError as e:
            err_msg = f"HTTP {e.response.status_code}"
            logger.warning("LLM API HTTP status error: %s", err_msg)
            last_error = RuntimeError(err_msg)
            break
        except httpx.ConnectError:
            err_msg = f"Cannot connect to {provider} service."
            logger.warning("LLM connection error: %s", err_msg)
            last_error = RuntimeError(err_msg)
            break
        except httpx.TimeoutException:
            err_msg = f"Timeout connecting to {provider}."
            logger.warning("LLM timeout error: %s", err_msg)
            last_error = RuntimeError(err_msg)
            break
        except Exception as e:
            logger.exception("Unexpected error calling LLM provider %s", provider)
            last_error = e
            break

    # 3. If AI failed, gracefully fall back to high-quality deterministic extractor
    safe_reason = str(last_error) if last_error else "Provider unavailable"
    logger.info("Serving extractive fallback for format '%s' due to: %s", actual_fmt, safe_reason)

    data = generate_demo(text, actual_fmt)
    fallback_notice = f"AI generation unavailable ({safe_reason}). Displaying source-grounded extractive fallback."
    return data, True, fallback_notice
