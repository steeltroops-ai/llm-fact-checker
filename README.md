# LLM Fact Checker

Real-time claim verification using LLMs and embeddings.

## Tech Stack

**Frontend (Port 3000):** Next.js 14, TypeScript, Tailwind CSS  
**Backend (Port 8000):** Hono.js, Bun, Redis (optional)  
**ML Service (Port 8001):** FastAPI, Gemini/OpenAI, Sentence Transformers

## Structure

```
llm-fact-checker/
├── frontend/          # Next.js app
├── backend/           # Hono.js API
├── ml-service/        # FastAPI ML service
└── docker-compose.yml # Docker setup
```

## Setup

### Prerequisites
- Bun 1.0+
- Python 3.11+
- Gemini API key (free at https://makersuite.google.com/app/apikey)

### Environment Configuration

**Backend (.env):**
```bash
PORT=8000
ML_SERVICE_URL=http://localhost:8001
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
REDIS_URL=redis://localhost:6379  # optional
```

**ML Service (.env):**
```bash
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
MODEL_NAME=gemini-2.5-flash
EMBEDDING_MODEL=all-MiniLM-L6-v2
```

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Install & Run

```bash
# Install dependencies
cd frontend && bun install
cd ../backend && bun install
cd ../ml-service && pip install -r requirements.txt

# Run services (3 terminals)
cd ml-service && python main.py      # Terminal 1
cd backend && bun run index.ts       # Terminal 2
cd frontend && bun run dev           # Terminal 3
```

Or use Docker:
```bash
docker-compose up
```

## API Endpoints

### Backend API

**POST /api/verify**
```json
Request:  { "claim": "string" }
Response: {
  "claim": "string",
  "verdict": "true|false|uncertain",
  "confidence": 0.95,
  "explanation": "string",
  "sources": ["string"]
}
```

**GET /health** - Health check

### ML Service

**POST /verify** - Claim verification  
**GET /** - Service info  
**GET /docs** - OpenAPI documentation

## Testing

```bash
# Test ML service
curl -X POST http://localhost:8001/verify \
  -H "Content-Type: application/json" \
  -d '{"claim":"Water boils at 100°C"}'

# Test backend
curl -X POST http://localhost:8000/api/verify \
  -H "Content-Type: application/json" \
  -d '{"claim":"Water boils at 100°C"}'

# Run tests
cd backend && bun test --run
cd frontend && bun test --run
cd ml-service && pytest
```
