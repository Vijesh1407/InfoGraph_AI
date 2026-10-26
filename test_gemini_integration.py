"""Automated test suite verifying Gemini integration and reliable fallback.

Uses mocked provider responses; does NOT require a real API key or make paid network calls.
"""
import os
import sys
from pathlib import Path

# Add backend directory to sys.path so app package can be imported
sys.path.insert(0, str(Path(__file__).resolve().parent / "backend"))

import unittest
from unittest.mock import patch, AsyncMock
import asyncio
import json
import httpx

from app.services.llm_service import generate_infographic
from app.services.pdf_service import extract_pdf_text
import fitz  # PyMuPDF


class TestGeminiIntegrationAndFallback(unittest.IsolatedAsyncioTestCase):

    def setUp(self):
        self.sample_text = (
            "Deep neural networks transform data across multiple representations. "
            "First, raw inputs are normalized and preprocessed. "
            "Next, input tensors propagate forward through weighted layers and activation functions. "
            "Then, backpropagation computes the gradient of the loss function with respect to weights. "
            "Finally, an optimization algorithm like Adam updates model parameters iteratively."
        )

    # ── 1. Valid Gemini Responses for All Formats ──────────────────────────────

    @patch.dict(os.environ, {"LLM_PROVIDER": "gemini", "GEMINI_API_KEY": "mock-valid-key", "GEMINI_MODEL": "gemini-1.5-flash"})
    @patch("app.services.llm_service._call_gemini")
    async def test_valid_gemini_process(self, mock_gemini):
        mock_response = json.dumps({
            "type": "process",
            "title": "Neural Network Training Pipeline",
            "subtitle": "Iterative optimization stages",
            "steps": [
                {"step_number": 1, "title": "Data Preprocessing", "description": "Normalize and clean input batches."},
                {"step_number": 2, "title": "Forward Propagation", "description": "Compute activations through layers."},
                {"step_number": 3, "title": "Backpropagation", "description": "Calculate loss gradients via chain rule."},
                {"step_number": 4, "title": "Weight Update", "description": "Apply gradient descent optimizer."},
            ],
            "summary": "Repeated over multiple epochs to minimize prediction error."
        })
        mock_gemini.return_value = mock_response

        data, is_demo, notice = await generate_infographic(self.sample_text, "process")
        self.assertFalse(is_demo, "Genuine AI generation should set is_demo=False")
        self.assertIsNone(notice, "Genuine AI generation should have no demo notice")
        self.assertEqual(data.type, "process")
        self.assertEqual(len(data.steps), 4)
        self.assertEqual(data.title, "Neural Network Training Pipeline")

    @patch.dict(os.environ, {"LLM_PROVIDER": "gemini", "GEMINI_API_KEY": "mock-valid-key", "GEMINI_MODEL": "gemini-1.5-flash"})
    @patch("app.services.llm_service._call_gemini")
    async def test_valid_gemini_concept_map(self, mock_gemini):
        mock_response = json.dumps({
            "type": "concept_map",
            "title": "Neural Network Principles",
            "subtitle": "Core architectural pillars",
            "main_concept": "Artificial Neural Network",
            "subtopics": [
                {"id": "sub-1", "name": "Layers & Neurons", "description": "Hierarchical nodes structuring features.", "relationship_to_main": "Composed of"},
                {"id": "sub-2", "name": "Activation Functions", "description": "Non-linear mappings like ReLU.", "relationship_to_main": "Regulates"},
                {"id": "sub-3", "name": "Synaptic Weights", "description": "Learned numerical parameters.", "relationship_to_main": "Parameterized by"},
            ],
            "summary": "Universal approximation through weighted layered representations."
        })
        mock_gemini.return_value = mock_response

        data, is_demo, notice = await generate_infographic(self.sample_text, "concept_map")
        self.assertFalse(is_demo)
        self.assertIsNone(notice)
        self.assertEqual(data.type, "concept_map")
        self.assertEqual(data.main_concept, "Artificial Neural Network")
        self.assertEqual(len(data.subtopics), 3)

    @patch.dict(os.environ, {"LLM_PROVIDER": "gemini", "GEMINI_API_KEY": "mock-valid-key", "GEMINI_MODEL": "gemini-1.5-flash"})
    @patch("app.services.llm_service._call_gemini")
    async def test_valid_gemini_timeline(self, mock_gemini):
        mock_response = json.dumps({
            "type": "timeline",
            "title": "AI Milestones",
            "subtitle": "Chronological breakthrough progression",
            "events": [
                {"label": "Turing Test Paper", "date": "1950", "description": "Computing Machinery and Intelligence."},
                {"label": "Dartmouth Conference", "date": "1956", "description": "Birth of Artificial Intelligence field."},
                {"label": "Deep Blue Defeats Kasparov", "date": "1997", "description": "Chess mastery benchmark achieved."},
            ],
            "summary": "Decades of algorithmic and hardware convergence."
        })
        mock_gemini.return_value = mock_response

        data, is_demo, notice = await generate_infographic(self.sample_text, "timeline")
        self.assertFalse(is_demo)
        self.assertIsNone(notice)
        self.assertEqual(data.type, "timeline")
        self.assertEqual(len(data.events), 3)

    @patch.dict(os.environ, {"LLM_PROVIDER": "gemini", "GEMINI_API_KEY": "mock-valid-key", "GEMINI_MODEL": "gemini-1.5-flash"})
    @patch("app.services.llm_service._call_gemini")
    async def test_valid_gemini_comparison(self, mock_gemini):
        mock_response = json.dumps({
            "type": "comparison",
            "title": "Supervised vs Unsupervised Learning",
            "subtitle": "Paradigm analysis",
            "items": [
                {"name": "Supervised", "description": "Learns from labeled targets."},
                {"name": "Unsupervised", "description": "Discovers latent patterns."}
            ],
            "attributes": [
                {"attribute": "Data Requirements", "values": {"Supervised": "Labeled samples", "Unsupervised": "Raw unlabeled data"}},
                {"attribute": "Primary Objective", "values": {"Supervised": "Prediction & classification", "Unsupervised": "Clustering & representation"}}
            ],
            "summary": "Choice depends on dataset annotation availability."
        })
        mock_gemini.return_value = mock_response

        data, is_demo, notice = await generate_infographic(self.sample_text, "comparison")
        self.assertFalse(is_demo)
        self.assertIsNone(notice)
        self.assertEqual(data.type, "comparison")
        self.assertEqual(len(data.items), 2)
        self.assertEqual(len(data.attributes), 2)

    # ── 2. Missing API Key Fallback ────────────────────────────────────────────

    @patch.dict(os.environ, {"LLM_PROVIDER": "gemini", "GEMINI_API_KEY": ""})
    async def test_missing_api_key_graceful_fallback(self):
        data, is_demo, notice = await generate_infographic(self.sample_text, "process")
        self.assertTrue(is_demo, "Missing key must return fallback with is_demo=True")
        self.assertIn("Gemini API key is not configured", notice or "")
        self.assertEqual(data.type, "process")
        self.assertGreaterEqual(len(data.steps), 2)

    # ── 3. Quota & Rate Limit (HTTP 429) Handling ─────────────────────────────

    @patch.dict(os.environ, {"LLM_PROVIDER": "gemini", "GEMINI_API_KEY": "mock-key"})
    @patch("app.services.llm_service._call_gemini")
    async def test_rate_limit_quota_error_fallback(self, mock_gemini):
        mock_gemini.side_effect = RuntimeError("Gemini free-tier quota or rate limit exceeded.")

        data, is_demo, notice = await generate_infographic(self.sample_text, "timeline")
        self.assertTrue(is_demo)
        self.assertIn("quota or rate limit exceeded", notice or "")
        self.assertEqual(data.type, "timeline")

    # ── 4. Unauthenticated (HTTP 401) Handling ────────────────────────────────

    @patch.dict(os.environ, {"LLM_PROVIDER": "gemini", "GEMINI_API_KEY": "mock-invalid-key"})
    @patch("app.services.llm_service._call_gemini")
    async def test_unauthenticated_fallback(self, mock_gemini):
        mock_gemini.side_effect = RuntimeError("Invalid or unauthorized Gemini API key.")

        data, is_demo, notice = await generate_infographic(self.sample_text, "concept_map")
        self.assertTrue(is_demo)
        self.assertIn("Invalid or unauthorized", notice or "")
        self.assertEqual(data.type, "concept_map")

    # ── 5. Bounded Recovery on Malformed JSON ──────────────────────────────────

    @patch.dict(os.environ, {"LLM_PROVIDER": "gemini", "GEMINI_API_KEY": "mock-key"})
    @patch("app.services.llm_service._call_gemini")
    async def test_bounded_recovery_retry(self, mock_gemini):
        # First attempt returns broken JSON, second attempt returns valid JSON
        malformed = "Here is your json: { broken json ..."
        valid = json.dumps({
            "type": "process",
            "title": "Recovered Process",
            "subtitle": "Success on retry",
            "steps": [
                {"step_number": 1, "title": "Step 1", "description": "Desc 1"},
                {"step_number": 2, "title": "Step 2", "description": "Desc 2"},
            ]
        })
        mock_gemini.side_effect = [malformed, valid]

        data, is_demo, notice = await generate_infographic(self.sample_text, "process")
        self.assertFalse(is_demo, "Recovered retry should return genuine AI data")
        self.assertIsNone(notice)
        self.assertEqual(data.title, "Recovered Process")
        self.assertEqual(mock_gemini.call_count, 2)

    # ── 6. Malformed JSON Exhausted -> Fallback ────────────────────────────────

    @patch.dict(os.environ, {"LLM_PROVIDER": "gemini", "GEMINI_API_KEY": "mock-key"})
    @patch("app.services.llm_service._call_gemini")
    async def test_malformed_json_exhausted_fallback(self, mock_gemini):
        # Both attempts return unparseable string
        mock_gemini.return_value = "Non-json plain text response."

        data, is_demo, notice = await generate_infographic(self.sample_text, "process")
        self.assertTrue(is_demo)
        self.assertIn("extractive fallback", notice or "")
        self.assertEqual(data.type, "process")

    # ── 7. Deterministic Demo Mode (No AI) ────────────────────────────────────

    @patch.dict(os.environ, {"LLM_PROVIDER": "demo"})
    async def test_demo_mode_operational(self):
        for fmt in ["process", "concept_map", "timeline", "comparison"]:
            data, is_demo, notice = await generate_infographic(self.sample_text, fmt)
            self.assertTrue(is_demo)
            self.assertEqual(data.type, fmt)

    # ── 8. PDF Text Extraction Preserved ──────────────────────────────────────

    def test_pdf_extraction_integrity(self):
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 72), "InfoGraph AI Document: Neural Network Architectures")
        pdf_bytes = doc.tobytes()
        doc.close()

        extracted_text, is_scanned = extract_pdf_text(pdf_bytes)
        self.assertFalse(is_scanned)
        self.assertIn("InfoGraph AI Document", extracted_text)


if __name__ == "__main__":
    unittest.main()
