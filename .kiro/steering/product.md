---
inclusion: always
---

# Product Overview

LLM Fact Checker is a Retrieval-Augmented Generation (RAG) system that analyzes news posts and social media statements, extracts key claims, and verifies them against a vector database of trusted facts from government sources.

## Core Product Principles

- **Evidence-Based Verification**: Ground all verdicts in retrieved authoritative sources (PIB press releases)
- **Transparent Reasoning**: Always provide confidence scores, retrieved evidence, and clear explanations
- **Multi-Provider Flexibility**: Support both Gemini and OpenAI with provider-agnostic interfaces
- **Performance Matters**: Cache responses and optimize for sub-second retrieval
- **Modular Pipeline**: Clean separation between claim extraction, retrieval, and LLM comparison

## System Architecture

Two-tier architecture with Next.js handling both frontend and API gateway:

1. **Frontend + API Gateway** (Port 3000): Next.js App Router application
   - Single-page interface for claim submission
   - API routes (`/app/api/*`) proxy requests to ML service
   - Implements Redis caching layer (optional)
   - Handles request validation and rate limiting
   - Real-time verification results display

2. **ML Service** (Port 8001): FastAPI inference service with RAG pipeline
   - **Claim/Entity Extraction**: NLP models (spaCy/HuggingFace) extract key claims
   - **Vector Retrieval**: ChromaDB/FAISS searches embedded fact base
   - **LLM Comparison**: GPT/Gemini compares claims against retrieved evidence
   - **Fact Base Management**: 30-50 verified PIB statements with embeddings

## RAG Pipeline Flow

```
Input Text → Claim Extraction → Embedding Generation → Vector Search → Top-K Retrieval
                                                                              ↓
User Interface ← Structured Response ← LLM Comparison ← Retrieved Facts
```

## Verification Response Schema

All verification responses must include:
- `verdict`: "true" | "false" | "unverifiable"
- `confidence`: 0.0 to 1.0 float (optional bonus feature)
- `explanation`: Human-readable reasoning from LLM
- `evidence`: Array of retrieved fact base statements (top-k similar)
- `claim`: Extracted claim from input text

Example:
```json
{
  "verdict": "true",
  "confidence": 0.92,
  "evidence": [
    "Retrieved statement 1 from PIB",
    "Retrieved statement 2 from PIB"
  ],
  "reasoning": "The retrieved statements match the main claim closely, including timeline and scope.",
  "claim": "free electricity to all farmers"
}
```

## Fact Base Structure

- **Source**: PIB (Press Information Bureau) press releases and verified government statements
- **Size**: 30-50 verified factual statements
- **Storage**: `ml-service/data/fact_base.json`
- **Schema**: Each fact has id, claim, verdict, confidence, explanation, sources, metadata, embedding
- **Embeddings**: Generated using sentence-transformers (all-MiniLM-L6-v2) or OpenAI embeddings
- **Validation**: JSON schema validation before loading

## Claim Extraction Strategy

- Use spaCy NER or HuggingFace transformers for entity/claim detection
- Extract key factual statements (policies, dates, organizations, locations)
- Filter out opinions, questions, and vague statements
- Return structured claims with entities highlighted

## Vector Retrieval Strategy

- Store fact embeddings in ChromaDB or FAISS
- Use cosine similarity for semantic search
- Retrieve top-k (3-5) most similar facts
- Apply similarity threshold (e.g., 0.3) to filter irrelevant results
- Return "unverifiable" if no facts meet threshold

## LLM Comparison Prompt Pattern

Construct prompts that include:
1. Original input text
2. Extracted claim
3. Retrieved evidence (top-k facts)
4. Classification instructions (true/false/unverifiable)
5. Request for reasoning and confidence

## Feature Development Guidelines

When adding new features:
- Maintain modular pipeline: extraction → retrieval → comparison
- Add property-based tests for correctness validation
- Update fact base schema if modifying fact structure
- Consider caching implications for performance (Redis in Next.js API routes)
- Preserve multi-provider LLM support
- Document API changes in ARCHITECTURE.md
- Test with real PIB data samples

## Error Handling Conventions

- Frontend UI: Display user-friendly error messages, log technical details
- Next.js API Routes: Return structured error responses with status codes
- ML Service: Raise specific exceptions (ClaimExtractionError, FactBaseError, LLMError, RetrievalError)
- Never expose API keys or internal errors to end users
- Handle edge cases: empty input, no claims found, no similar facts, LLM timeout

## Testing Requirements

- Unit tests for each pipeline component (extraction, retrieval, comparison)
- Property-based tests for invariants (Hypothesis/fast-check)
- Integration tests for end-to-end RAG pipeline
- Mock LLM responses in tests (avoid real API calls)
- Validate fact base integrity and embedding consistency
- Test with sample PIB statements

## Performance Targets

- Claim extraction: < 500ms
- Vector retrieval: < 200ms (with indexed embeddings)
- LLM comparison: < 2 seconds
- Total verification latency: < 3 seconds (cached: < 100ms)
- Fact base load time: < 1 second
- Support 100+ concurrent requests

## Bonus Features (Optional)

- Confidence scoring based on similarity scores and LLM certainty
- "Was this helpful?" feedback toggle for user ratings
- Local LLM support (Mistral, Llama) instead of OpenAI
- Vague claim filtering using similarity threshold
- Streamlit/Gradio UI alternative to Next.js
