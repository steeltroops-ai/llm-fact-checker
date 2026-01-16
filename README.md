# LLM Fact Checker

A RAG (Retrieval-Augmented Generation) pipeline that verifies claims against a database of 40 verified PIB (Press Information Bureau) statements.

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS (Port 3000)
- **ML Service:** FastAPI, ChromaDB, spaCy, Sentence Transformers (Port 8001)
- **LLM:** Google Gemini / OpenAI GPT

## Quick Start

```bash
# 1. Clone and install
cd frontend && bun install
cd ../ml-service && pip install -r requirements.txt
python -m spacy download en_core_web_sm

# 2. Configure (add your API key)
cd ml-service && cp .env.example .env
# Edit .env: GEMINI_API_KEY=your_key

# 3. Generate embeddings (required once)
python scripts/add_example_embeddings.py

# 4. Run services
# Terminal 1: 
cd ml-service && python main.py

# Terminal 2:
cd frontend && bun run dev

# 5. Open http://localhost:3000
```

## Docker

```bash
docker-compose up
```

## API Endpoints

### POST /rag/verify (ML Service - Port 8001)

```json
// Request
{ "claim": "The government announced free electricity to farmers" }

// Response
{
  "verdict": "true" | "false" | "unverifiable",
  "confidence": 0.92,
  "evidence": [...],
  "explanation": "..."
}
```

### POST /api/rag/verify (Frontend - Port 3000)
Same as above, proxies to ML service.

## Project Structure

```
├── frontend/           # Next.js app
│   ├── app/           # Pages + API routes
│   └── lib/           # Utilities
├── ml-service/        # FastAPI service
│   ├── services/      # RAG pipeline components
│   ├── data/          # fact_base.json (40 PIB statements)
│   └── tests/         # Unit + integration tests
└── docker-compose.yml
```

## Testing

```bash
# ML Service
cd ml-service && pytest

# Frontend
cd frontend && bun test
```

## Environment Variables

**ML Service (.env):**
```bash
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_key
SIMILARITY_THRESHOLD=0.3
TOP_K_RESULTS=5
```

**Frontend (.env.local):**
```bash
ML_SERVICE_URL=http://localhost:8001
```

## License

MIT
