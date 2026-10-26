# InfoGraph AI — Intelligent Text-to-Infographic Generator

> **"Turn your ideas into visuals."**

Convert any text or PDF into a beautiful, structured infographic — powered by AI with a modern ChatGPT-style conversational interface.

---

## What's New in this Redesign

- **ChatGPT-Style Conversational Interface**:
  - Collapsible sidebar with generation history, session management, and AI provider status.
  - Centered welcome screen with 4 clickable sample prompts.
  - Floating bottom-centered prompt composer with multiline auto-resize, PDF attachment, format selector, and theme picker.
  - Responsive conversational message stream with prominent infographic display.
- **Brand New Format — Concept Map / Overview**:
  - Visual central concept hub with interconnected subtopics, relationship tags (e.g. *Consists of*, *Optimizes*, *Governs*), and takeaways.
- **Source-Grounded Extractive Fallback Engine**:
  - Replaced generic chunking with genuine heuristic content analysis.
  - Generates actual step titles from source verbs (no generic placeholders like "Understand the Context").
  - Compares true subjects (e.g., "Supervised Learning" vs "Unsupervised Learning") instead of "Option A" vs "Option B".
  - Preserves factual dates and years; never invents dates.
- **Rich Theme Selection**:
  - 5 curated themes: Midnight, Ocean Breeze, Emerald Forest, Neon Violet, Minimalist Slate.
  - Switch themes live without regenerating from the model.
- **Copy Summary & PNG Export**:
  - 1-click **Copy Summary** copies structured markdown to clipboard.
  - **Download PNG** captures only the pristine infographic at 2x crisp resolution.

---

## Formats Supported

1. **Process**: Ordered stages, procedures, workflows, and pipelines.
2. **Concept Map / Overview**: Architectural systems, principles, and interconnected subconcepts.
3. **Timeline**: Historical or chronological events with real dates.
4. **Comparison**: Side-by-side attribute analysis of two or more entities.
5. **Auto**: Automatically analyzes source density and structure to select the best visual format.

---

## Quick Start (Windows PowerShell)

### Prerequisites

- Node.js v18+ (`node --version`)
- Python 3.10+ (`python --version`)

### 1. Backend Setup

```powershell
cd "c:\InfoGraph AI\backend"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Configure Environment (`backend/.env`)

```powershell
# Set LLM_PROVIDER to: demo | gemini | openai | ollama
LLM_PROVIDER=demo
```

### 3. Start the Backend Server

```powershell
cd "c:\InfoGraph AI\backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend: http://localhost:8000  
API Documentation: http://localhost:8000/docs  
Health check: http://localhost:8000/health  

### 4. Start Frontend

```powershell
cd "c:\InfoGraph AI\frontend"
npm run dev
```

Application URL: http://localhost:5173

---

## Enabling Genuine AI Generation

Edit `backend/.env`:

### Google Gemini (Recommended)
```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
```

### OpenAI
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
```

### Ollama (Local)
```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

---

## Testing

Run the full API test suite:

```powershell
cd "c:\InfoGraph AI"
python test_api.py
```

Run frontend build verification:

```powershell
cd "c:\InfoGraph AI\frontend"
npm run build
npm run lint
```
