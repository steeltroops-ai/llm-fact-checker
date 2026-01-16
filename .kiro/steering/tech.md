---
inclusion: always
---

# Technology Stack

## Build System & Package Managers

- **Bun**: Primary runtime and package manager for JavaScript/TypeScript
- **Python 3.11+**: ML service runtime
- **uv**: Fast Python package installer and resolver (install: `pip install uv` or see https://docs.astral.sh/uv/)
- **venv**: Python virtual environment for ML service isolation

## Frontend + API Gateway Stack

- **Framework**: Next.js 14 (App Router)
- **Runtime**: Bun (development), Node.js (production)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query, Axios
- **UI Components**: Lucide React icons, Recharts
- **Caching**: Redis (optional, with ioredis client)
- **Testing**: Vitest, Testing Library, fast-check (property-based testing)

## ML Service Stack (RAG Pipeline)

### Core Framework
- **API Framework**: FastAPI
- **Validation**: Pydantic

### NLP & Claim Extraction
- **spaCy**: Named Entity Recognition (NER) and claim extraction
- **HuggingFace Transformers**: Alternative transformer-based extraction
- **Models**: en_core_web_sm (spaCy), BERT-based models (HuggingFace)

### Embeddings & Vector Search
- **Embedding Models**: 
  - sentence-transformers (all-MiniLM-L6-v2) - primary
  - OpenAI embeddings API - alternative
- **Vector Databases**:
  - ChromaDB - primary (persistent storage)
  - FAISS - alternative (in-memory, faster)
- **Similarity**: Cosine similarity for semantic search

### LLM Integration
- **Providers**: Google Gemini, OpenAI GPT-3.5/4
- **Frameworks**: LangChain, LangChain-OpenAI, LangChain-Google-GenAI
- **Local LLM Support** (bonus): Mistral, Llama via Ollama/HuggingFace

### Testing
- **pytest**: Unit and integration tests
- **pytest-mock**: Mocking LLM responses
- **pytest-asyncio**: Async test support
- **Hypothesis**: Property-based testing for correctness

## Data Sources

- **PIB (Press Information Bureau)**: https://www.pib.gov.in/ViewRss.aspx
- **Fact Base**: 30-50 verified government press releases
- **Format**: JSON with structured schema

## Infrastructure

- **Containerization**: Docker, Docker Compose
- **Networking**: Bridge network for inter-service communication
- **Caching**: Redis 7 Alpine (optional)

## Common Commands

### Development

```bash
# Install all dependencies
bun install                              # Root and frontend
cd frontend && bun install               # Frontend only

# ML service setup (using uv and venv)
cd ml-service
python -m venv .venv                     # Create virtual environment
# Activate virtual environment:
# Windows: .venv\Scripts\activate
# Unix/macOS: source .venv/bin/activate
uv pip install -r requirements.txt      # Install dependencies with uv

# Download spaCy model (required for claim extraction)
python -m spacy download en_core_web_sm

# Run services locally (2 terminals)
cd ml-service && python main.py          # Terminal 1 - Port 8001
cd frontend && bun run dev               # Terminal 2 - Port 3000

# Run with Docker
docker-compose up                        # All services
docker-compose up -d                     # Detached mode
docker-compose down                      # Stop services
```

### Fact Base Management

```bash
# Activate virtual environment first
cd ml-service
# Windows: .venv\Scripts\activate
# Unix/macOS: source .venv/bin/activate

# Validate fact base schema
python scripts/validate_fact_base.py

# Generate embeddings for fact base
python scripts/add_example_embeddings.py

# Fetch PIB data (if implemented)
python scripts/fetch_pib_data.py
```

### Testing

```bash
# Frontend tests (includes API route tests)
cd frontend && bun test                  # Run once
cd frontend && bun run test:watch       # Watch mode

# ML service tests (activate venv first)
cd ml-service
# Windows: .venv\Scripts\activate
# Unix/macOS: source .venv/bin/activate
pytest                                   # All tests
pytest -v                                # Verbose
pytest tests/test_claim_extraction.py   # Specific component
pytest tests/test_vector_retrieval.py
pytest tests/test_llm_comparison.py
```

### Building

```bash
# Frontend production build
cd frontend && bun run build

# Docker builds
docker-compose build                     # Build all services
docker-compose build frontend            # Build specific service
```

### Linting

```bash
cd frontend && bun run lint             # ESLint

# ML service linting (activate venv first)
cd ml-service
# Windows: .venv\Scripts\activate
# Unix/macOS: source .venv/bin/activate
pylint services/                        # Python linting (if configured)
```

## Environment Variables

### Frontend + API Gateway (.env.local)
- `NEXT_PUBLIC_API_URL`: Backend API endpoint for client-side (default: http://localhost:8000)
- `ML_SERVICE_URL`: ML service endpoint for server-side API routes (default: http://localhost:8001)
- `REDIS_URL`: Redis connection string (optional)

### ML Service (.env)
- `LLM_PROVIDER`: "gemini" or "openai"
- `GEMINI_API_KEY` or `OPENAI_API_KEY`: API credentials
- `MODEL_NAME`: LLM model (e.g., gemini-2.5-flash, gpt-3.5-turbo)
- `EMBEDDING_MODEL`: Sentence transformer model (default: all-MiniLM-L6-v2)
- `EMBEDDING_PROVIDER`: "sentence-transformers" or "openai"
- `VECTOR_DB`: "chromadb" or "faiss"
- `SIMILARITY_THRESHOLD`: Minimum similarity for retrieval (default: 0.3)
- `TOP_K_RESULTS`: Number of facts to retrieve (default: 3-5)

## Testing Frameworks

- **Frontend + API Routes**: Vitest with jsdom, fast-check for property-based tests
- **ML Service**: pytest with Hypothesis for property-based tests
- Property-based testing is used extensively for correctness validation

## RAG Pipeline Components

### 1. Claim Extraction Module
- **Location**: `ml-service/services/claim_extractor.py`
- **Dependencies**: spaCy, transformers
- **Input**: Raw text (news post, social media statement)
- **Output**: Structured claims with entities

### 2. Vector Retrieval Module
- **Location**: `ml-service/services/vector_retriever.py`
- **Dependencies**: sentence-transformers, chromadb/faiss
- **Input**: Claim embedding
- **Output**: Top-k similar facts with similarity scores

### 3. LLM Comparison Module
- **Location**: `ml-service/services/llm_comparator.py`
- **Dependencies**: langchain, openai/google-generativeai
- **Input**: Claim + retrieved evidence
- **Output**: Verdict, reasoning, confidence

### 4. Fact Base Manager
- **Location**: `ml-service/services/fact_base_manager.py`
- **Dependencies**: pydantic, numpy
- **Functions**: Load, validate, embed, index facts

## API Route Patterns

Next.js API routes (`frontend/app/api/*/route.ts`) follow these conventions:
- Use `NextRequest` and `NextResponse` types
- Implement proper error handling with status codes
- Proxy requests to ML service using `fetch` or `axios`
- Cache responses in Redis when available
- Validate request bodies before forwarding
- Return consistent JSON response formats

## Code Organization Principles

- **Modular Pipeline**: Each RAG component is a separate, testable module
- **Provider Abstraction**: LLM and embedding providers use abstract interfaces
- **Configuration-Driven**: Use environment variables for all configurable parameters
- **Type Safety**: Pydantic models for all data structures
- **Error Boundaries**: Specific exception types for each component
- **Logging**: Structured logging for debugging and monitoring
