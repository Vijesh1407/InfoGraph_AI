"""Image generation service for InfoGraph AI.

Uses Cloudflare Workers AI REST API with model:
@cf/black-forest-labs/flux-1-schnell
to synthesize category-specific educational infographic images.
"""
from __future__ import annotations
import base64
import io
import logging
import os
import time
import uuid
from pathlib import Path
from typing import Optional, Tuple

import httpx
from dotenv import load_dotenv
from PIL import Image

logger = logging.getLogger(__name__)

# Ensure backend/.env is reliably loaded relative to this file's location
ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

# Directory for persisted generated images
GENERATED_DIR = Path(__file__).resolve().parent.parent / "generated_images"
GENERATED_DIR.mkdir(parents=True, exist_ok=True)

# Default configuration
DEFAULT_IMAGE_PROVIDER = "cloudflare"
DEFAULT_MODEL = "@cf/black-forest-labs/flux-1-schnell"


def get_image_config() -> dict:
    """Retrieve active image generation configuration from environment."""
    provider = os.getenv("IMAGE_PROVIDER", DEFAULT_IMAGE_PROVIDER).strip().lower()
    model = os.getenv("IMAGE_MODEL", DEFAULT_MODEL).strip()
    account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID", "").strip()
    api_token = os.getenv("CLOUDFLARE_API_TOKEN", "").strip()

    is_configured = bool(
        account_id
        and api_token
        and account_id not in ("your_account_id", "your_cloudflare_account_id")
        and api_token not in ("your_cloudflare_api_token", "your_api_token_here")
    )

    return {
        "provider": provider,
        "model": model,
        "account_id": account_id,
        "has_credentials": is_configured,
        "has_token": is_configured,  # Backwards compatibility
    }


def is_valid_image(data: bytes) -> bool:
    """Validate image bytes using Pillow and magic bytes."""
    if len(data) < 100:
        return False
    # Check common image headers: PNG, JPEG, WEBP
    if (
        data.startswith(b"\x89PNG\r\n\x1a\n")
        or data.startswith(b"\xff\xd8\xff")
        or (data[:4] == b"RIFF" and data[8:12] == b"WEBP")
    ):
        try:
            with Image.open(io.BytesIO(data)) as img:
                img.verify()
            return True
        except Exception:
            return False
    return False


async def generate_infographic_image(
    prompt: str,
    category: str,
    theme: Optional[str] = "default",
) -> Tuple[bool, Optional[str], Optional[str], Optional[str], dict]:
    """Execute real image generation using Cloudflare Workers AI REST API.

    Returns:
        (success, image_url, image_b64, error_message, metadata)
    """
    config = get_image_config()
    provider = config["provider"]
    model = config["model"]
    account_id = config["account_id"]
    has_credentials = config["has_credentials"]
    api_token = os.getenv("CLOUDFLARE_API_TOKEN", "").strip()

    meta = {
        "provider": provider,
        "model": model,
        "category": category,
        "prompt": prompt,
    }

    # 1. Validate credentials
    if not has_credentials:
        logger.info(
            "Cloudflare credentials not fully configured in backend/.env. Live model inference remains unverified."
        )
        msg = (
            "Cloudflare Workers AI credentials (CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN) are not configured in backend/.env. "
            f"Please set your Cloudflare credentials to enable live {model} image synthesis using Cloudflare's daily free allowance."
        )
        return False, None, None, msg, {**meta, "status": "missing_credentials"}

    # 2. Call Cloudflare Workers AI REST API endpoint
    endpoint_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}"
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json",
    }
    payload = {
        "prompt": prompt,
        "steps": 4,  # Recommended 4 steps for distilled FLUX-1-schnell
    }

    logger.info("Dispatching image generation request to Cloudflare Workers AI: %s", endpoint_url)
    start_time = time.time()

    try:
        async with httpx.AsyncClient(timeout=65.0) as client:
            resp = await client.post(endpoint_url, headers=headers, json=payload)
            elapsed = time.time() - start_time
            status = resp.status_code

            if status == 200:
                content_type = resp.headers.get("content-type", "")
                image_bytes: Optional[bytes] = None

                # Cloudflare can return JSON with base64 string or raw binary image
                if "application/json" in content_type:
                    try:
                        json_data = resp.json()
                        # Cloudflare format: {"result": {"image": "<base64>"}, "success": true} or {"image": "<base64>"}
                        b64_str = ""
                        if isinstance(json_data, dict):
                            result_field = json_data.get("result")
                            if isinstance(result_field, dict) and "image" in result_field:
                                b64_str = result_field["image"]
                            elif "image" in json_data:
                                b64_str = json_data["image"]

                        if b64_str:
                            image_bytes = base64.b64decode(b64_str)
                    except Exception as parse_err:
                        logger.error("Failed to parse JSON response from Cloudflare: %s", parse_err)
                else:
                    # Raw image binary
                    image_bytes = resp.content

                if not image_bytes or not is_valid_image(image_bytes):
                    logger.error("Cloudflare returned HTTP 200 but response is not a valid image.")
                    return (
                        False,
                        None,
                        None,
                        "Cloudflare Workers AI returned invalid or unparseable image data.",
                        {**meta, "status": "invalid_image"},
                    )

                # Persist to disk as PNG with safe unique filename
                unique_id = f"infograph_cf_{int(time.time())}_{uuid.uuid4().hex[:8]}"
                file_name = f"{unique_id}.png"
                file_path = GENERATED_DIR / file_name

                with Image.open(io.BytesIO(image_bytes)) as pil_img:
                    pil_img.save(file_path, format="PNG", optimize=True)
                    width, height = pil_img.size

                # Generate base64 data URI for rapid UI rendering
                b64_output = base64.b64encode(image_bytes).decode("utf-8")
                image_b64 = f"data:image/png;base64,{b64_output}"
                image_url = f"/api/v1/infographics/images/{file_name}"

                logger.info("Successfully synthesized image via Cloudflare in %.2fs: %s", elapsed, file_name)
                return (
                    True,
                    image_url,
                    image_b64,
                    None,
                    {
                        **meta,
                        "status": "generated",
                        "filename": file_name,
                        "duration_seconds": round(elapsed, 2),
                        "width": width,
                        "height": height,
                    },
                )

            # Error handling for Cloudflare REST API
            error_detail = ""
            try:
                err_data = resp.json()
                errors = err_data.get("errors", [])
                if errors and isinstance(errors, list):
                    error_detail = "; ".join(e.get("message", str(e)) for e in errors)
                elif "messages" in err_data:
                    error_detail = "; ".join(str(m) for m in err_data.get("messages", []))
            except Exception:
                error_detail = resp.text[:200]

            logger.warning("Cloudflare Workers AI returned HTTP %d: %s", status, error_detail)

            if status in (401, 403):
                msg = (
                    f"Cloudflare authentication failed (HTTP {status}). "
                    f"Please verify that CLOUDFLARE_API_TOKEN has 'Workers AI' Read/Run permissions: {error_detail}"
                )
                return False, None, None, msg, {**meta, "status": "auth_error", "http_code": status}

            elif status == 404:
                msg = (
                    f"Cloudflare account or model not found (HTTP 404). "
                    f"Please verify that CLOUDFLARE_ACCOUNT_ID is correct in backend/.env: {error_detail}"
                )
                return False, None, None, msg, {**meta, "status": "not_found", "http_code": 404}

            elif status == 429:
                msg = (
                    f"Cloudflare Workers AI rate limit or free daily allocation reached (HTTP 429). "
                    f"Detail: {error_detail}. Free neurons quota refreshes daily."
                )
                return False, None, None, msg, {**meta, "status": "rate_limited", "http_code": 429}

            else:
                msg = f"Cloudflare Workers AI inference error (HTTP {status}): {error_detail}"
                return False, None, None, msg, {**meta, "status": "provider_error", "http_code": status}

    except httpx.TimeoutException:
        msg = f"Cloudflare Workers AI request timed out after 65 seconds for model '{model}'."
        logger.warning(msg)
        return False, None, None, msg, {**meta, "status": "timeout"}

    except httpx.ConnectError:
        msg = "Failed to connect to Cloudflare Workers AI API. Please check your internet connection."
        logger.error(msg)
        return False, None, None, msg, {**meta, "status": "connection_error"}

    except Exception as e:
        logger.exception("Unexpected error during Cloudflare image generation")
        msg = f"Unexpected error during Cloudflare image generation: {e}"
        return False, None, None, msg, {**meta, "status": "unexpected_error"}


def get_generated_image_path(filename: str) -> Optional[Path]:
    """Safely resolve path to a generated image with path traversal protection."""
    clean_name = os.path.basename(filename)
    if not clean_name or ".." in clean_name or "/" in clean_name or "\\" in clean_name:
        return None

    target = (GENERATED_DIR / clean_name).resolve()
    try:
        target.relative_to(GENERATED_DIR.resolve())
    except ValueError:
        return None

    if target.is_file():
        return target
    return None
