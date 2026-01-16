# Requirements Document: RAG Pipeline Implementation

## Introduction

This document specifies the requirements for implementing a complete Retrieval-Augmented Generation (RAG) pipeline for the LLM Fact Checker system. The implementation will add claim extraction, vector-based fact retrieval, and evidence-based LLM comparison to meet the assignment requirements while maintaining professional, industry-grade code quality.

## Glossary

- **RAG**: Retrieval-Augmented Generation - combining information retrieval with LLM generation
- **Claim Extraction**: Identifying factual statements from input text using NLP
- **PIB**: Press Information Bureau - source of verified government statements
- **Fact Base**: Curated collection of 30-50 verified PIB statements
- **Embedding**: Vector representation of text for semantic similarity
- **Vector Retrieval**: Finding similar facts using cosine similarity on embeddings
- **Evidence**: Retrieved facts used to support or refute a claim
- **Verdict**: Final classification (true, false, or unverifiable)
- **Top-K**: Retrieving the K most similar facts (typically 3-5)

## Requirements

### Requirement 1: Claim/Entity Extraction

**User Story:** As a user, I want the system to automatically extract key factual claims from my input text, so that I can verify complex statements containing multiple claims.

#### Acceptance Criteria

1.1. WHEN a user submits text containing multiple statements, THE System SHALL extract individual factual claims using spaCy or HuggingFace transformers

1.2. WHEN extracting claims, THE System SHALL identify named entities including:
   - Organizations (e.g., "Indian government")
   - Dates and timelines (e.g., "July 2025")
   - Policies and programs (e.g., "free electricity")
   - Locations (e.g., "all farmers")

1.3. WHEN no clear claims are found, THE System SHALL return the original text as a single claim

1.4. THE System SHALL filter out opinions, questions, and vague statements that cannot be fact-checked

1.5. THE System SHALL return extracted claims in structured format with entities highlighted

### Requirement 2: PIB Fact Base Creation

**User Story:** As a system administrator, I want a curated database of 30-50 verified PIB statements, so that the system can verify claims against authoritative government sources.

#### Acceptance Criteria

2.1. THE System SHALL maintain a fact base with 30-50 verified factual statements from PIB (Press Information Bureau)

2.2. EACH fact SHALL include:
   - Unique ID
   - Claim text
   - Source URL (pib.gov.in)
   - Publication date
   - Category/topic
   - Metadata (ministry, tags)

2.3. THE Fact base SHALL be stored in `ml-service/data/fact_base.json` with proper JSON schema validation

2.4. THE System SHALL provide a script (`fetch_pib_data.py`) to scrape and populate PIB statements

2.5. THE Fact base SHALL be validated on startup to ensure data integrity

### Requirement 3: Fact Base Management

**User Story:** As a developer, I want a fact base manager that loads, validates, and indexes facts, so that the system can efficiently retrieve relevant information.

#### Acceptance Criteria

3.1. THE System SHALL load the fact base from JSON on startup

3.2. THE System SHALL validate each fact against the JSON schema before loading

3.3. THE System SHALL generate embeddings for all facts using sentence-transformers (all-MiniLM-L6-v2)

3.4. THE System SHALL cache embeddings to avoid recomputation on restart

3.5. THE System SHALL log fact base statistics (count, embedding dimensions, load time)

### Requirement 4: Vector-Based Fact Retrieval

**User Story:** As a user, I want the system to find relevant facts for my claim using semantic search, so that verification is based on actual evidence.

#### Acceptance Criteria

4.1. THE System SHALL implement vector retrieval using ChromaDB or FAISS

4.2. WHEN a claim is submitted, THE System SHALL:
   - Generate embedding for the claim
   - Search the vector database using cosine similarity
   - Retrieve top-k (3-5) most similar facts
   - Return facts with similarity scores

4.3. THE System SHALL apply a minimum similarity threshold (default: 0.3)

4.4. IF no facts meet the threshold, THE System SHALL return "unverifiable" verdict

4.5. THE System SHALL log retrieval metrics (query time, similarity scores, facts retrieved)

### Requirement 5: LLM-Powered Evidence Comparison

**User Story:** As a user, I want verification based on retrieved evidence, so that I can trust the verdict with supporting facts.

#### Acceptance Criteria

5.1. THE System SHALL construct prompts including:
   - Original input text
   - Extracted claim
   - Retrieved evidence (top-k facts with sources)
   - Classification instructions (true/false/unverifiable)
   - Request for reasoning

5.2. THE LLM SHALL classify claims as "true", "false", or "unverifiable"

5.3. THE LLM SHALL provide reasoning that explicitly references the retrieved evidence

5.4. THE System SHALL return both the verdict and the evidence used

5.5. THE System SHALL handle cases where evidence is contradictory or insufficient

### Requirement 6: End-to-End RAG Pipeline

**User Story:** As a user, I want a complete verification pipeline that extracts claims, retrieves evidence, and provides verdicts, so that I get accurate, evidence-based results.

#### Acceptance Criteria

6.1. THE System SHALL implement a new endpoint `/rag/verify` that executes the full RAG pipeline

6.2. THE Pipeline SHALL execute in order:
   1. Claim extraction
   2. Embedding generation
   3. Vector retrieval
   4. LLM comparison
   5. Response formatting

6.3. THE System SHALL return a structured response including:
   - `claim`: Extracted claim text
   - `verdict`: "true" | "false" | "unverifiable"
   - `confidence`: 0.0 to 1.0 (optional)
   - `explanation`: LLM reasoning
   - `evidence`: Array of retrieved facts with similarity scores
   - `sources`: Array of PIB URLs

6.4. THE Pipeline SHALL complete within 5 seconds for typical claims

6.5. THE System SHALL log each pipeline stage with timing information

### Requirement 7: Frontend Integration

**User Story:** As a user, I want to see the extracted claim and supporting evidence in the UI, so that I understand how the verdict was reached.

#### Acceptance Criteria

7.1. THE Frontend SHALL display the extracted claim separately from the original input

7.2. THE Frontend SHALL show retrieved evidence with:
   - Fact text
   - Similarity score
   - Source attribution (PIB URL)
   - Publication date

7.3. THE Frontend SHALL update loading messages to reflect RAG stages:
   - "Extracting claims..."
   - "Searching fact database..."
   - "Analyzing evidence..."
   - "Generating verdict..."

7.4. THE Frontend SHALL handle the new response schema from `/rag/verify`

7.5. THE Frontend SHALL provide a fallback to the legacy `/verify` endpoint if RAG fails

### Requirement 8: Modular Code Architecture

**User Story:** As a developer, I want clean, modular code with clear separation of concerns, so that I can maintain and extend the system easily.

#### Acceptance Criteria

8.1. THE System SHALL implement separate modules for:
   - `ClaimExtractor`: Claim/entity extraction
   - `FactBaseManager`: Fact loading and validation
   - `VectorRetriever`: Embedding-based retrieval
   - `LLMComparator`: Evidence-based comparison

8.2. EACH module SHALL have a clear interface with type hints (Pydantic models)

8.3. EACH module SHALL be independently testable with mocked dependencies

8.4. THE System SHALL use dependency injection for LLM and embedding providers

8.5. THE System SHALL follow Python best practices (PEP 8, type hints, docstrings)

### Requirement 9: Comprehensive Testing

**User Story:** As a developer, I want comprehensive tests for each component, so that I can ensure system correctness and catch regressions.

#### Acceptance Criteria

9.1. THE System SHALL include unit tests for:
   - Claim extraction (various input formats)
   - Fact base loading and validation
   - Vector retrieval (similarity calculations)
   - LLM comparison (prompt construction)

9.2. THE System SHALL include integration tests for:
   - End-to-end RAG pipeline
   - API endpoints
   - Error handling

9.3. THE System SHALL include property-based tests using Hypothesis for:
   - Claim extraction invariants
   - Similarity score ranges
   - Response schema validation

9.4. THE System SHALL mock LLM responses to avoid real API calls in tests

9.5. THE System SHALL achieve >80% code coverage for new components

### Requirement 10: Error Handling and Resilience

**User Story:** As a user, I want clear error messages when something goes wrong, so that I understand what happened and can take action.

#### Acceptance Criteria

10.1. THE System SHALL define specific exception types:
   - `ClaimExtractionError`: Failed to extract claims
   - `FactBaseError`: Fact base loading/validation failed
   - `RetrievalError`: Vector search failed
   - `LLMError`: LLM API call failed

10.2. THE System SHALL handle edge cases gracefully:
   - Empty input → validation error
   - No claims found → return original text
   - No similar facts → return "unverifiable"
   - LLM timeout → retry with exponential backoff

10.3. THE System SHALL log all errors with context (input, stage, stack trace)

10.4. THE Frontend SHALL display user-friendly error messages without technical details

10.5. THE System SHALL provide fallback behavior when RAG components fail

### Requirement 11: Performance Optimization

**User Story:** As a user, I want fast verification results, so that I can verify claims efficiently.

#### Acceptance Criteria

11.1. THE System SHALL cache fact embeddings to avoid recomputation

11.2. THE System SHALL use efficient vector search (indexed FAISS or ChromaDB)

11.3. THE System SHALL complete claim extraction in < 500ms

11.4. THE System SHALL complete vector retrieval in < 200ms

11.5. THE System SHALL complete full RAG pipeline in < 5 seconds

### Requirement 12: Configuration and Flexibility

**User Story:** As a developer, I want configurable parameters for the RAG pipeline, so that I can tune performance and accuracy.

#### Acceptance Criteria

12.1. THE System SHALL support environment variables for:
   - `VECTOR_DB`: "chromadb" or "faiss"
   - `SIMILARITY_THRESHOLD`: Minimum similarity (default: 0.3)
   - `TOP_K_RESULTS`: Number of facts to retrieve (default: 5)
   - `EMBEDDING_PROVIDER`: "sentence-transformers" or "openai"
   - `CLAIM_EXTRACTION_MODEL`: spaCy model name

12.2. THE System SHALL validate configuration on startup

12.3. THE System SHALL log active configuration values

12.4. THE System SHALL provide sensible defaults for all parameters

12.5. THE System SHALL allow runtime configuration updates (optional)

### Requirement 13: Documentation and Deployment

**User Story:** As a developer, I want clear documentation and deployment instructions, so that I can set up and run the system easily.

#### Acceptance Criteria

13.1. THE System SHALL include a comprehensive README with:
   - Setup instructions
   - Environment variable configuration
   - Running instructions (local and Docker)
   - API documentation
   - Sample input/output

13.2. THE System SHALL provide example scripts:
   - `fetch_pib_data.py`: Populate fact base
   - `validate_fact_base.py`: Validate data integrity
   - `benchmark_retrieval.py`: Performance testing

13.3. THE System SHALL include sample fact base data for testing

13.4. THE System SHALL provide Docker Compose configuration for easy deployment

13.5. THE System SHALL include a video walkthrough (5-7 minutes) demonstrating the system

## Bonus Features (Optional)

### Bonus 1: Confidence Scoring

**User Story:** As a user, I want to see confidence scores based on evidence quality, so that I can assess verdict reliability.

#### Acceptance Criteria

B1.1. THE System SHALL calculate confidence based on:
   - Average similarity score of retrieved facts
   - LLM certainty indicators
   - Number of supporting facts

B1.2. THE Confidence score SHALL be between 0.0 and 1.0

B1.3. HIGH confidence (>0.8) SHALL require high similarity (>0.7) and clear LLM verdict

### Bonus 2: Feedback Toggle

**User Story:** As a user, I want to provide feedback on verification results, so that the system can improve over time.

#### Acceptance Criteria

B2.1. THE Frontend SHALL display "Was this helpful?" toggle with thumbs up/down

B2.2. THE System SHALL log feedback with claim ID and verdict

B2.3. THE Frontend SHALL show thank you message after feedback submission

### Bonus 3: Local LLM Support

**User Story:** As a developer, I want to use local LLMs instead of API-based models, so that I can reduce costs and improve privacy.

#### Acceptance Criteria

B3.1. THE System SHALL support local LLMs via Ollama or HuggingFace

B3.2. THE System SHALL provide configuration for local model selection

B3.3. THE System SHALL maintain the same interface for local and API-based LLMs

### Bonus 4: Streamlit/Gradio UI

**User Story:** As a user, I want an alternative simple UI for quick testing, so that I can verify claims without the full web application.

#### Acceptance Criteria

B4.1. THE System SHALL provide a Streamlit or Gradio interface

B4.2. THE UI SHALL support all core features (claim input, verification, results display)

B4.3. THE UI SHALL be launchable with a single command

## Non-Functional Requirements

### Performance
- Claim extraction: < 500ms
- Vector retrieval: < 200ms
- LLM comparison: < 2 seconds
- Total pipeline: < 5 seconds
- Support 100+ concurrent requests

### Scalability
- Fact base: Support up to 1000 facts
- Vector database: Efficient indexing for fast retrieval
- Caching: Redis integration for response caching

### Maintainability
- Modular architecture with clear interfaces
- Comprehensive test coverage (>80%)
- Type hints and docstrings for all functions
- Logging for debugging and monitoring

### Security
- No API keys in code or logs
- Input validation and sanitization
- Rate limiting on API endpoints
- CORS configuration for production

## Success Criteria

The implementation will be considered successful when:

1. ✅ All 13 core requirements are implemented and tested
2. ✅ RAG pipeline executes end-to-end with real PIB data
3. ✅ Frontend displays extracted claims and evidence
4. ✅ Test coverage exceeds 80% for new components
5. ✅ Performance targets are met (< 5s total latency)
6. ✅ Documentation is complete with video walkthrough
7. ✅ System can be deployed with Docker Compose
8. ✅ Code follows professional standards (PEP 8, type hints, clean architecture)
