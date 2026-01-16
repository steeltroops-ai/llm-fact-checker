---
inclusion: always
---

# Project Structure

## Root Directory

```
llm-fact-checker/
├── .kiro/                    # Kiro configuration and specs
│   ├── specs/               # Feature specifications
│   └── steering/            # Project steering documents
├── frontend/                # Next.js web application (includes API routes)
├── ml-service/              # FastAPI ML service with RAG pipeline
├── docs/                    # Documentation
├── docker-compose.yml       # Multi-service orchestration
├── package.json            # Root workspace configuration
├── README.md               # Project overview and setup instructions
└── ARCHITECTURE.md         # System architecture documentation
```

## Frontend Structure

```
frontend/
├── app/                     # Next.js App Router
│   ├── api/                # API routes (gateway to ML service)
│   │   ├── health/         # Health check endpoint
│   │   ├── rag/            # RAG verification endpoints
│   │   │   └── verify/     # Main RAG pipeline endpoint
│   │   └── verify/         # Legacy verification endpoint
│   ├── page.tsx            # Main UI component
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Global styles
├── lib/                    # Shared utilities
│   ├── redis.ts            # Redis caching client (optional)
│   └── api-client.ts       # ML service API client
├── public/                 # Static assets
├── src/                    # Additional source (legacy)
├── node_modules/           # Dependencies
├── package.json            # Frontend dependencies
├── vitest.config.ts        # Test configuration
├── vitest.setup.ts         # Test setup
├── next.config.ts          # Next.js configuration
└── tsconfig.json           # TypeScript configuration
```

## ML Service Structure (RAG Pipeline)

```
ml-service/
├── services/               # Core RAG pipeline components
│   ├── claim_extractor.py      # NLP-based claim/entity extraction
│   ├── vector_retriever.py     # Embedding-based fact retrieval
│   ├── llm_comparator.py       # LLM-powered claim comparison
│   ├── fact_base_manager.py    # Fact base loading and indexing
│   ├── fact_checker.py         # Legacy verification logic
│   ├── llm_client.py           # LLM abstraction layer
│   └── __init__.py
├── schemas/                # Data validation
│   ├── fact_schema.py          # Fact data models (Pydantic)
│   ├── claim_schema.py         # Claim extraction models
│   ├── verification_schema.py  # Verification response models
│   ├── fact_base_schema.json   # JSON schema
│   └── README.md
├── tests/                  # Test suite
│   ├── test_claim_extraction.py          # Claim extraction tests
│   ├── test_vector_retrieval.py          # Vector search tests
│   ├── test_llm_comparison.py            # LLM comparison tests
│   ├── test_fact_base_manager.py         # Fact base tests
│   ├── test_rag_pipeline.py              # End-to-end pipeline tests
│   ├── test_fact_checker.py              # Legacy unit tests
│   ├── test_fact_checker_properties.py   # Property-based tests
│   ├── test_llm_client.py                # LLM client tests
│   ├── test_fact_schema.py               # Schema tests
│   └── test_json_serialization_properties.py
├── scripts/                # Utility scripts
│   ├── validate_fact_base.py         # Fact base validation
│   ├── add_example_embeddings.py     # Embedding generation
│   ├── fetch_pib_data.py             # PIB data scraper (optional)
│   └── benchmark_retrieval.py        # Performance benchmarking
├── data/                   # Fact base storage
│   ├── fact_base.json              # Main fact database (30-50 PIB statements)
│   ├── fact_base_example.json      # Example fact structure
│   └── embeddings/                 # Cached embeddings (optional)
├── models/                 # Downloaded models (optional)
│   └── en_core_web_sm/            # spaCy model
├── logs/                   # Application logs
│   └── vectors/                   # Vector storage logs
├── .hypothesis/            # Hypothesis test artifacts
├── .venv/                  # Python virtual environment (gitignored)
├── main.py                # FastAPI application entry point
├── requirements.txt       # Python dependencies
└── pytest.ini             # Pytest configuration
```

## Spec Structure

```
.kiro/specs/{feature-name}/
├── requirements.md         # User stories and acceptance criteria
├── design.md              # Technical design and correctness properties
└── tasks.md               # Implementation task list
```

## Key File Locations

### API Endpoints
- Next.js API routes: `frontend/app/api/*/route.ts`
- RAG verification endpoint: `frontend/app/api/rag/verify/route.ts`
- ML service main: `ml-service/main.py`

### RAG Pipeline Components
- Claim extraction: `ml-service/services/claim_extractor.py`
- Vector retrieval: `ml-service/services/vector_retriever.py`
- LLM comparison: `ml-service/services/llm_comparator.py`
- Fact base manager: `ml-service/services/fact_base_manager.py`

### Legacy Components
- Fact verification: `ml-service/services/fact_checker.py`
- LLM integration: `ml-service/services/llm_client.py`

### Frontend
- Main UI: `frontend/app/page.tsx`
- API gateway logic: `frontend/app/api/verify/route.ts`
- Redis caching: `frontend/lib/redis.ts`

### Configuration
- Environment examples: `.env.example` files in each service
- Docker config: `docker-compose.yml` (root)
- Test configs: `vitest.config.ts`, `pytest.ini`

### Data & Schemas
- Fact database: `ml-service/data/fact_base.json`
- Pydantic schemas: `ml-service/schemas/*.py`
- JSON schemas: `ml-service/schemas/fact_base_schema.json`

## Naming Conventions

- **Specs**: kebab-case (e.g., `rag-fact-verification-upgrade`)
- **Python files**: snake_case (e.g., `claim_extractor.py`)
- **Python classes**: PascalCase (e.g., `ClaimExtractor`, `VectorRetriever`)
- **TypeScript files**: kebab-case for routes, PascalCase for components
- **Test files**: `test_*.py` (Python), `*.test.tsx` (TypeScript)
- **Environment files**: `.env`, `.env.example`, `.env.local`

## Module Organization

- **Service Isolation**: Each service is self-contained with its own dependencies
- **Component Modularity**: Each RAG component is independently testable
- **Schema Sharing**: Shared types/schemas defined per service (no cross-service imports)
- **HTTP Communication**: Services communicate via HTTP APIs only
- **Test Co-location**: Tests co-located with source code or in dedicated `tests/` directory

## RAG Pipeline Data Flow

```
Input Text
    ↓
ClaimExtractor (spaCy/HuggingFace)
    ↓
Extracted Claims + Entities
    ↓
VectorRetriever (sentence-transformers + ChromaDB/FAISS)
    ↓
Top-K Similar Facts (with similarity scores)
    ↓
LLMComparator (GPT/Gemini + LangChain)
    ↓
Verdict + Evidence + Reasoning
    ↓
Structured Response (JSON)
```

## Development Workflow

1. **Setup Environment**:
   - Frontend: `cd frontend && bun install`
   - ML Service: `cd ml-service && python -m venv .venv && source .venv/bin/activate && uv pip install -r requirements.txt`
2. **Fact Base Setup**: Populate `data/fact_base.json` with 30-50 PIB statements
3. **Embedding Generation**: Run `scripts/add_example_embeddings.py` to generate embeddings
4. **Component Development**: Build each RAG component independently with tests
5. **Integration**: Connect components in FastAPI endpoints
6. **Frontend Integration**: Build Next.js UI and API routes
7. **Testing**: Run unit, integration, and property-based tests
8. **Deployment**: Use Docker Compose for multi-service deployment

## Bonus Features Structure

- **Confidence Scoring**: Add to `llm_comparator.py` based on similarity + LLM certainty
- **Feedback Toggle**: Add to frontend UI with state management
- **Local LLM**: Add Ollama/HuggingFace support in `llm_client.py`
- **Vague Filtering**: Add threshold logic in `vector_retriever.py`
- **Streamlit UI**: Alternative UI in `ml-service/streamlit_app.py`
