# Architecture

## RAG Pipeline Flow

```
User Input → Claim Extraction → Embedding → Vector Search → LLM Comparison → Verdict
                 (spaCy)      (MiniLM-L6)   (ChromaDB)      (Gemini/GPT)
```

## Services

| Service | Port | Tech |
|---------|------|------|
| Frontend | 3000 | Next.js 14 |
| ML Service | 8001 | FastAPI |

## ML Service Components

```
ml-service/services/
├── claim_extractor.py    # spaCy NER extraction
├── vector_retriever.py   # ChromaDB similarity search
├── llm_comparator.py     # LLM verdict generation
├── rag_pipeline.py       # Pipeline orchestrator
└── fact_base_manager.py  # Loads 40 PIB facts + embeddings
```

## Data Flow

1. **Input** → Frontend validates, calls `/api/rag/verify`
2. **Frontend API** → Proxies to ML service `/rag/verify`
3. **Claim Extraction** → spaCy extracts entities (ORG, DATE, GPE)
4. **Vector Search** → ChromaDB finds top-5 similar facts (cosine similarity)
5. **LLM Comparison** → Gemini/GPT compares claim vs evidence
6. **Response** → Verdict + confidence + evidence + sources

## Key Files

| File | Purpose |
|------|---------|
| `ml-service/main.py` | FastAPI entry, `/rag/verify` endpoint |
| `ml-service/data/fact_base.json` | 40 PIB facts with embeddings |
| `frontend/app/page.tsx` | Main UI |
| `frontend/app/api/rag/verify/route.ts` | API proxy |

## Performance

- Claim extraction: <500ms
- Vector retrieval: <200ms  
- LLM comparison: <2s
- **Total: <3s**
