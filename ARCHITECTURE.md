# Architecture

## System Overview

```
User Browser (Port 3000)
        ↓
Frontend (Next.js)
        ↓ POST /api/verify
Backend (Hono.js, Port 8000)
        ↓ POST /verify
ML Service (FastAPI, Port 8001)
        ↓
LLM (Gemini/OpenAI)
```

## Data Flow

1. **User submits claim** → Frontend validates input
2. **Frontend → Backend** → Check Redis cache
3. **Backend → ML Service** → If not cached
4. **ML Service:**
   - Generate embeddings (Sentence Transformers)
   - Call LLM with structured prompt
   - Parse JSON response
5. **Response flows back** → Cache in Redis → Display to user

## Components

### Frontend (Next.js)
- **Location:** `frontend/app/page.tsx`
- **Tech:** Next.js 14, TypeScript, Tailwind CSS
- **Features:** Form validation, loading states, result display

### Backend (Hono.js)
- **Location:** `backend/index.ts`
- **Tech:** Hono.js on Bun runtime
- **Features:** Request validation, Redis caching, ML service proxy
- **Caching:** 1-hour TTL, graceful degradation if Redis unavailable

### ML Service (FastAPI)
- **Location:** `ml-service/main.py`
- **Tech:** FastAPI, Sentence Transformers, Gemini/OpenAI
- **Features:** Embedding generation, LLM integration, response parsing

## API Contracts

### POST /api/verify (Backend)
```typescript
Request:  { claim: string }
Response: {
  claim: string
  verdict: "true" | "false" | "uncertain"
  confidence: number  // 0-1
  explanation: string
  sources: string[]
}
```

### POST /verify (ML Service)
```python
Request:  { "claim": str }
Response: {
  "claim": str,
  "verdict": str,
  "confidence": float,
  "explanation": str,
  "sources": List[str]
}
```

## Key Files

```
backend/
├── index.ts          # Main API server
└── cache.ts          # Redis caching logic

ml-service/
├── main.py           # FastAPI app
└── services/
    ├── llm_client.py      # LLM abstraction
    └── fact_checker.py    # Verification logic

frontend/
└── app/
    └── page.tsx      # Main UI component
```

## Environment Variables

**Backend:**
- `PORT` - Server port (default: 8000)
- `ML_SERVICE_URL` - ML service endpoint
- `LLM_PROVIDER` - "gemini" or "openai"
- `GEMINI_API_KEY` or `OPENAI_API_KEY`
- `REDIS_URL` - Optional cache

**ML Service:**
- `LLM_PROVIDER` - "gemini" or "openai"
- `GEMINI_API_KEY` or `OPENAI_API_KEY`
- `MODEL_NAME` - LLM model to use
- `EMBEDDING_MODEL` - Sentence transformer model

**Frontend:**
- `NEXT_PUBLIC_API_URL` - Backend API endpoint

## Error Handling

**Input Validation:**
- Empty claims → 400 error
- Claims > 1000 chars → 400 error

**Service Errors:**
- ML service down → 503 error
- LLM API error → 500 error with fallback
- Redis unavailable → Graceful degradation (no caching)

**Timeouts:**
- Backend → ML service: 30 seconds
- LLM API calls: Configured per provider

## Performance

**Response Times:**
- Cached: < 100ms
- Uncached: 2-5 seconds (LLM processing)

**Caching:**
- Redis TTL: 1 hour
- Cache key: `claim:${hash(claim.toLowerCase().trim())}`

## Docker Setup

```yaml
services:
  frontend:  Port 3000
  backend:   Port 8000
  ml-service: Port 8001
  redis:     Port 6379 (optional)
```

All services on shared network for inter-service communication.
