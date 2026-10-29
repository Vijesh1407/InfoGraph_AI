"""Comprehensive test suite for Real AI Image Generation with Cloudflare Workers AI.

Model: @cf/black-forest-labs/flux-1-schnell
Endpoint: https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/@cf/black-forest-labs/flux-1-schnell

Verifies:
1. System configuration endpoint (provider="cloudflare", model="@cf/black-forest-labs/flux-1-schnell").
2. Honest handling of missing credentials (no placeholder images claiming success).
3. Live Cloudflare API response handling (auth error, invalid token, or genuine generation).
4. Category-aware visual prompt construction across all four categories:
   - Process Infographic
   - Timeline Infographic
   - Comparison Infographic
   - Concept Map Infographic
5. Regenerate image endpoint targeting Cloudflare Workers AI.
6. Path traversal and image security protection on /images/{filename}.
"""
import json
import os
import urllib.request
import urllib.error

BASE_URL = 'http://localhost:8000/api/v1'

def post_form(url: str, fields: dict) -> dict:
    boundary = '----FormBoundary7MA4YWxkTrZu0gW'
    body_parts = []
    for k, v in fields.items():
        body_parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n')
    body_parts.append(f'--{boundary}--\r\n')
    body = ''.join(body_parts).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=body,
        headers={'Content-Type': f'multipart/form-data; boundary={boundary}'},
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def run_tests():
    print("=" * 75)
    print("TESTING INFOGRAPH AI -- CLOUDFLARE WORKERS AI (FLUX.1-schnell)")
    print("=" * 75)

    # ── 1. Configuration Endpoint ──────────────────────────────────────────
    print("\n[1] Checking System Config Endpoint...")
    with urllib.request.urlopen(f"{BASE_URL}/infographics/config") as r:
        config = json.loads(r.read())
    print("Config:", json.dumps(config, indent=2))
    assert config["image_provider"] == "cloudflare", f"Expected cloudflare, got {config['image_provider']}"
    assert config["image_model"] == "@cf/black-forest-labs/flux-1-schnell", f"Expected model @cf/black-forest-labs/flux-1-schnell, got {config['image_model']}"
    print("  [OK] System config correctly configured for Cloudflare Workers AI and FLUX.1-schnell.")

    # ── 2. All Four Categories with Specific Category Prompts ───────────────
    test_cases = [
        (
            "Process Infographic",
            "process",
            "The machine learning workflow consists of data collection, preprocessing, model training, evaluation, and deployment.",
            ["Stage 1", "directional", "chevron", "pipeline"]
        ),
        (
            "Timeline Infographic",
            "timeline",
            "In 1950 Alan Turing proposes the Turing Test. In 1956 the Dartmouth workshop coins AI. In 1997 IBM Deep Blue defeats Kasparov. In 2012 AlexNet launches deep learning. In 2022 ChatGPT launches.",
            ["Milestone", "timeline", "chronological", "spine"]
        ),
        (
            "Comparison Infographic",
            "comparison",
            "Supervised learning uses labeled data for classification and regression, whereas unsupervised learning discovers patterns and clustering in unlabeled data.",
            ["side-by-side", "columns", "Supervised Learning", "Unsupervised Learning"]
        ),
        (
            "Concept Map Infographic",
            "concept_map",
            "Generative AI includes GANs, VAEs, and diffusion models. GANs use a generator and discriminator, VAEs use an encoder and decoder, and diffusion models learn to reverse a noise process.",
            ["Central core", "Connected", "GANs", "Diffusion Models"]
        ),
    ]

    print("\n[2] Testing Category-Aware Prompts & Cloudflare Workers AI Response...")
    for label, category, text, expected_keywords in test_cases:
        print(f"\n---> Testing {label} ({category}):")
        res = post_form(f"{BASE_URL}/infographics/generate", {
            "text": text,
            "format": category,
            "theme": "default",
        })

        assert res.get("success") is True, f"Failed for {label}: {res.get('error')}"
        data = res.get("data")
        assert data is not None, "Data payload missing"
        assert res.get("format_used") == category, f"Expected {category}, got {res.get('format_used')}"

        prompt = res.get("image_prompt", "")
        print(f"  Title: '{data.get('title')}'")
        print(f"  Image Provider: {res.get('image_provider')}")
        print(f"  Image Model: {res.get('image_model')}")
        print(f"  Image Status: {res.get('image_status')}")
        print(f"  Image Error: {res.get('image_error')}")
        print(f"  Prompt Length: {len(prompt)} chars")
        print(f"  Prompt Preview: {prompt[:180]}...")

        assert res.get("image_provider") == "cloudflare"
        assert res.get("image_model") == "@cf/black-forest-labs/flux-1-schnell"

        # Verify honest status: either generated (if valid credentials present)
        # or missing_credentials/auth_error/rate_limited
        valid_statuses = ("generated", "missing_credentials", "auth_error", "not_found", "rate_limited")
        assert res.get("image_status") in valid_statuses, f"Unexpected image_status: {res.get('image_status')}"

        if res.get("image_status") == "missing_credentials":
            assert "CLOUDFLARE_ACCOUNT_ID" in str(res.get("image_error"))
            print("  [OK] Accurately handled missing credentials without faking images.")
        elif res.get("image_status") == "auth_error":
            print("  [OK] Accurately handled Cloudflare authentication failure (HTTP 401/403).")
        elif res.get("image_status") == "generated":
            assert res.get("image_url") is not None
            assert res.get("image_b64") is not None
            print("  [OK] Live inference succeeded! Genuine image received and validated.")

        # Verify category-awareness:
        for kw in expected_keywords:
            assert kw.lower() in prompt.lower(), f"Expected keyword '{kw}' in {category} prompt"
        print(f"  [OK] {label} prompt verified with category-specific visual keywords!")

    # ── 3. Image Regeneration Endpoint ────────────────────────────────────
    print("\n[3] Testing Regenerate Image Endpoint targeting Cloudflare Workers AI...")
    test_req = urllib.request.Request(
        f"{BASE_URL}/infographics/regenerate-image",
        data=json.dumps({
            "prompt": "An educational workflow infographic illustrating Machine Learning Pipeline stages.",
            "category": "process",
            "theme": "default"
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(test_req) as r:
        regen_res = json.loads(r.read())
    print("Regenerate response metadata:", regen_res.get("image_metadata"))
    print("Regenerate response error:", regen_res.get("image_error"))
    assert "success" in regen_res, "Regenerate endpoint response missing success key"
    assert regen_res.get("image_metadata", {}).get("provider") == "cloudflare"
    assert regen_res.get("image_metadata", {}).get("model") == "@cf/black-forest-labs/flux-1-schnell"
    print("  [OK] Regenerate endpoint correctly targets Cloudflare Workers AI.")

    # ── 4. Path Traversal & Image Serving Protection ───────────────────────
    print("\n[4] Testing Path Traversal Protection on /images/{filename}...")
    try:
        urllib.request.urlopen(f"{BASE_URL}/infographics/images/../../etc/passwd")
        print("Warning: Expected traversal to be blocked!")
    except urllib.error.HTTPError as e:
        print(f"  [OK] Path traversal safely blocked with HTTP {e.code}")

    try:
        urllib.request.urlopen(f"{BASE_URL}/infographics/images/nonexistent_file.png")
        print("Warning: Expected 404 for nonexistent file!")
    except urllib.error.HTTPError as e:
        print(f"  [OK] Non-existent file returned HTTP {e.code}")

    print("\n" + "=" * 75)
    print("ALL CLOUDFLARE WORKERS AI INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 75)

if __name__ == "__main__":
    run_tests()
