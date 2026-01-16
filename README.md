# AI Fact Checker

Verify claims using AI and a curated database of [ government/ or any other ] facts.

## What It Does

- **RAG Mode**: Checks claims against PIB government database
- **AI Mode**: Uses LLM for general fact verification

## Quick Start

### 1. Backend Setup

```bash
cd ml-service
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Configure
cp .env.example .env
# Add your API key to .env

# Run
python main.py
```

### 2. Frontend Setup

```bash
cd frontend
bun install
bun run dev
```

Visit `http://localhost:3000`

## Configuration

Edit `ml-service/.env`:

```env
# Choose: gemini, openai, or ollama
LLM_PROVIDER=gemini

# Add your key (not needed for ollama)
GEMINI_API_KEY=your_key_here
```

## Tech Stack

**Frontend**: Next.js, React, Tailwind CSS, Redis  
**Backend**: FastAPI, ChromaDB, spaCy, SentenceTransformers  
**LLMs**: Gemini, OpenAI, or Ollama (local)

## API

```bash
# RAG verification
POST /rag/verify
{"claim": "Your claim here"}

# AI verification
POST /verify
{"claim": "Your claim here"}
```

## Project Structure

```
├── frontend/          # Next.js app
│   ├── app/          # Pages and API routes
│   └── package.json
│
├── ml-service/       # Python backend
│   ├── main.py       # FastAPI server
│   ├── services/     # RAG pipeline
│   ├── data/         # Fact database
│   └── requirements.txt
```

## How It Works

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed diagrams and technical docs.

