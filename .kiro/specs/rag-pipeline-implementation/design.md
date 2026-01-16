# Design Document: RAG Pipeline Implementation

## Overview

This document provides the technical design for implementing a complete Retrieval-Augmented Generation (RAG) pipeline for the LLM Fact Checker. The design emphasizes modularity, testability, and professional code quality while meeting all assignment requirements.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  UI Components (page.tsx)                            │  │
│  │  - Claim Input                                       │  │
│  │  - Results Display (with evidence)                   │  │
│  │  - Loading States (RAG stages)                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Routes (/app/api/rag/verify/route.ts)          │  │
│  │  - Request validation                                │  │
│  │  - Redis caching (optional)                          │  │
│  │  - ML service proxy                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓ HTTP
┌─────────────────────────────────────────────────────────────┐
│              ML Service (FastAPI) - Port 8001               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  RAG Pipeline Endpoint (/rag/verify)                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. ClaimExtractor                                   │  │
│  │     - spaCy NER (en_core_web_sm)                     │  │
│  │     - Entity extraction (ORG, DATE, GPE, POLICY)    │  │
│  │     - Claim filtering                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  2. FactBaseManager                                  │  │
│  │     - Load fact_base.json                            │  │
│  │     - Validate schema                                │  │
│  │     - Generate embeddings                            │  │
│  │     - Cache embeddings                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  3. VectorRetriever                                  │  │
│  │     - ChromaDB/FAISS index                           │  │
│  │     - Cosine similarity search                       │  │
│  │     - Top-K retrieval (k=5)                          │  │
│  │     - Similarity threshold (0.3)                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  4. LLMComparator                                    │  │
│  │     - Construct evidence-based prompt                │  │
│  │     - Call LLM (Gemini/OpenAI)                       │  │
│  │     - Parse structured response                      │  │
│  │     - Calculate confidence (optional)                │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Response Formatter                                  │  │
│  │     - Combine all results                            │  │
│  │     - Format JSON response                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. ClaimExtractor

**Purpose:** Extract factual claims and entities from input text using NLP.

**Implementation:**
```python
# ml-service/services/claim_extractor.py

from typing import List, Dict
import spacy
from pydantic import BaseModel

class ExtractedClaim(BaseModel):
    """Extracted claim with entities"""
    text: str
    entities: Dict[str, List[str]]  # {entity_type: [entity_text]}
    confidence: float

class ClaimExtractor:
    """Extract claims and entities from text using spaCy"""
    
    def __init__(self, model_name: str = "en_core_web_sm"):
        self.nlp = spacy.load(model_name)
        
    def extract(self, text: str) -> ExtractedClaim:
        """Extract main claim and entities"""
        doc = self.nlp(text)
        
        # Extract entities
        entities = {}
        for ent in doc.ents:
            if ent.label_ not in entities:
                entities[ent.label_] = []
            entities[ent.label_].append(ent.text)
        
        # For now, use full text as claim
        # Can be enhanced with sentence segmentation
        claim_text = text.strip()
        
        return ExtractedClaim(
            text=claim_text,
            entities=entities,
            confidence=1.0 if entities else 0.5
        )
```

**Key Features:**
- Uses spaCy for NER (Named Entity Recognition)
- Extracts: ORG, DATE, GPE, PERSON, MONEY, etc.
- Returns structured claim with entities
- Filters out questions and opinions (future enhancement)

**Testing Strategy:**
- Unit tests with various input formats
- Test entity extraction accuracy
- Test edge cases (empty, very long, no entities)

---

### 2. FactBaseManager

**Purpose:** Load, validate, and manage the PIB fact base with embeddings.

**Implementation:**
```python
# ml-service/services/fact_base_manager.py

from typing import List, Optional
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
import json
import numpy as np
from pathlib import Path

class Fact(BaseModel):
    """Single fact from PIB"""
    id: str
    claim: str
    source_url: str
    publication_date: str
    category: str
    metadata: dict = Field(default_factory=dict)
    embedding: Optional[List[float]] = None

class FactBaseManager:
    """Manage fact base loading, validation, and embeddings"""
    
    def __init__(
        self,
        fact_base_path: str = "data/fact_base.json",
        embedding_model: str = "all-MiniLM-L6-v2",
        cache_embeddings: bool = True
    ):
        self.fact_base_path = Path(fact_base_path)
        self.embedding_model = SentenceTransformer(embedding_model)
        self.cache_embeddings = cache_embeddings
        self.facts: List[Fact] = []
        
    def load(self) -> List[Fact]:
        """Load and validate fact base"""
        print(f"📚 Loading fact base from {self.fact_base_path}")
        
        with open(self.fact_base_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Validate and parse facts
        self.facts = [Fact(**fact_data) for fact_data in data]
        
        print(f"✅ Loaded {len(self.facts)} facts")
        
        # Generate embeddings if not cached
        self._ensure_embeddings()
        
        return self.facts
    
    def _ensure_embeddings(self):
        """Generate embeddings for facts without them"""
        facts_without_embeddings = [f for f in self.facts if f.embedding is None]
        
        if not facts_without_embeddings:
            print("✅ All facts have embeddings")
            return
        
        print(f"🔄 Generating embeddings for {len(facts_without_embeddings)} facts...")
        
        claims = [f.claim for f in facts_without_embeddings]
        embeddings = self.embedding_model.encode(claims, show_progress_bar=True)
        
        for fact, embedding in zip(facts_without_embeddings, embeddings):
            fact.embedding = embedding.tolist()
        
        # Save back to file if caching enabled
        if self.cache_embeddings:
            self._save_with_embeddings()
        
        print("✅ Embeddings generated")
    
    def _save_with_embeddings(self):
        """Save fact base with embeddings"""
        data = [fact.model_dump() for fact in self.facts]
        with open(self.fact_base_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
```

**Key Features:**
- Loads facts from JSON with validation
- Generates embeddings using sentence-transformers
- Caches embeddings to avoid recomputation
- Validates schema using Pydantic

**Testing Strategy:**
- Test loading valid and invalid JSON
- Test embedding generation
- Test caching behavior
- Mock file I/O for unit tests

---

### 3. VectorRetriever

**Purpose:** Retrieve top-K similar facts using vector similarity search.

**Implementation:**
```python
# ml-service/services/vector_retriever.py

from typing import List, Tuple
import numpy as np
from sentence_transformers import SentenceTransformer
from .fact_base_manager import Fact
import chromadb
from chromadb.config import Settings

class RetrievedFact(BaseModel):
    """Fact with similarity score"""
    fact: Fact
    similarity: float

class VectorRetriever:
    """Retrieve similar facts using vector search"""
    
    def __init__(
        self,
        facts: List[Fact],
        embedding_model: SentenceTransformer,
        similarity_threshold: float = 0.3,
        top_k: int = 5,
        use_chromadb: bool = True
    ):
        self.facts = facts
        self.embedding_model = embedding_model
        self.similarity_threshold = similarity_threshold
        self.top_k = top_k
        
        if use_chromadb:
            self._init_chromadb()
        else:
            self._init_faiss()
    
    def _init_chromadb(self):
        """Initialize ChromaDB collection"""
        self.client = chromadb.Client(Settings(anonymized_telemetry=False))
        self.collection = self.client.create_collection(
            name="fact_base",
            metadata={"hnsw:space": "cosine"}
        )
        
        # Add facts to collection
        for fact in self.facts:
            self.collection.add(
                ids=[fact.id],
                embeddings=[fact.embedding],
                documents=[fact.claim],
                metadatas=[{
                    "source_url": fact.source_url,
                    "category": fact.category
                }]
            )
        
        print(f"✅ ChromaDB initialized with {len(self.facts)} facts")
    
    def retrieve(self, claim: str) -> List[RetrievedFact]:
        """Retrieve top-K similar facts for claim"""
        # Generate embedding for claim
        claim_embedding = self.embedding_model.encode([claim])[0]
        
        # Query ChromaDB
        results = self.collection.query(
            query_embeddings=[claim_embedding.tolist()],
            n_results=self.top_k
        )
        
        # Parse results
        retrieved = []
        for i, (fact_id, distance) in enumerate(zip(
            results['ids'][0],
            results['distances'][0]
        )):
            # Convert distance to similarity (cosine)
            similarity = 1 - distance
            
            if similarity >= self.similarity_threshold:
                fact = next(f for f in self.facts if f.id == fact_id)
                retrieved.append(RetrievedFact(
                    fact=fact,
                    similarity=similarity
                ))
        
        print(f"🔍 Retrieved {len(retrieved)} facts above threshold {self.similarity_threshold}")
        
        return retrieved
```

**Key Features:**
- ChromaDB for persistent vector storage
- FAISS fallback for in-memory search
- Cosine similarity metric
- Configurable threshold and top-K
- Returns facts with similarity scores

**Testing Strategy:**
- Test retrieval with known similar/dissimilar claims
- Test threshold filtering
- Test empty results handling
- Mock ChromaDB for unit tests

---

### 4. LLMComparator

**Purpose:** Compare claim against retrieved evidence using LLM.

**Implementation:**
```python
# ml-service/services/llm_comparator.py

from typing import List
from pydantic import BaseModel
from .llm_client import LLMClient
from .vector_retriever import RetrievedFact
import json

class ComparisonResult(BaseModel):
    """LLM comparison result"""
    verdict: str  # "true", "false", "unverifiable"
    confidence: float
    explanation: str
    reasoning: str

class LLMComparator:
    """Compare claims against evidence using LLM"""
    
    def __init__(self, llm_client: LLMClient):
        self.llm = llm_client
    
    def compare(
        self,
        claim: str,
        evidence: List[RetrievedFact]
    ) -> ComparisonResult:
        """Compare claim against retrieved evidence"""
        
        if not evidence:
            return ComparisonResult(
                verdict="unverifiable",
                confidence=0.0,
                explanation="No relevant evidence found in the fact base.",
                reasoning="Insufficient evidence to verify this claim."
            )
        
        # Construct evidence-based prompt
        prompt = self._build_prompt(claim, evidence)
        
        # Get LLM response
        response = self.llm.generate(prompt)
        
        # Parse response
        result = self._parse_response(response, evidence)
        
        return result
    
    def _build_prompt(self, claim: str, evidence: List[RetrievedFact]) -> str:
        """Build evidence-based prompt for LLM"""
        
        evidence_text = "\n\n".join([
            f"Evidence {i+1} (Similarity: {e.similarity:.2f}):\n"
            f"Claim: {e.fact.claim}\n"
            f"Source: {e.fact.source_url}\n"
            f"Date: {e.fact.publication_date}"
            for i, e in enumerate(evidence)
        ])
        
        prompt = f"""You are an expert fact-checker analyzing claims against verified evidence from the Press Information Bureau (PIB) of India.

**Claim to Verify:**
"{claim}"

**Retrieved Evidence from PIB:**
{evidence_text}

**Task:**
Compare the claim against the provided evidence and classify it as:
- "true": The claim is supported by the evidence
- "false": The claim contradicts the evidence
- "unverifiable": The evidence is insufficient or unclear

Provide your response in this exact JSON format:
{{
    "verdict": "true" or "false" or "unverifiable",
    "confidence": 0.0 to 1.0,
    "explanation": "Clear explanation referencing specific evidence",
    "reasoning": "Step-by-step reasoning process"
}}

**Guidelines:**
1. Base your verdict ONLY on the provided evidence
2. Reference specific evidence items in your explanation
3. Consider similarity scores when weighing evidence
4. Be objective and avoid speculation
5. If evidence is contradictory or unclear, use "unverifiable"
"""
        
        return prompt
    
    def _parse_response(
        self,
        response: str,
        evidence: List[RetrievedFact]
    ) -> ComparisonResult:
        """Parse LLM response into structured result"""
        
        try:
            # Extract JSON from response
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0].strip()
            else:
                json_str = response.strip()
            
            data = json.loads(json_str)
            
            # Calculate confidence if not provided
            if "confidence" not in data or data["confidence"] is None:
                data["confidence"] = self._calculate_confidence(
                    data.get("verdict", "unverifiable"),
                    evidence
                )
            
            return ComparisonResult(**data)
            
        except Exception as e:
            print(f"⚠️ Failed to parse LLM response: {e}")
            return ComparisonResult(
                verdict="unverifiable",
                confidence=0.5,
                explanation=response,
                reasoning="Failed to parse structured response"
            )
    
    def _calculate_confidence(
        self,
        verdict: str,
        evidence: List[RetrievedFact]
    ) -> float:
        """Calculate confidence based on evidence quality"""
        
        if not evidence:
            return 0.0
        
        # Average similarity score
        avg_similarity = sum(e.similarity for e in evidence) / len(evidence)
        
        # Adjust based on verdict
        if verdict == "unverifiable":
            return min(avg_similarity, 0.5)
        else:
            return avg_similarity
```

**Key Features:**
- Evidence-based prompt construction
- References specific PIB sources
- Structured JSON response parsing
- Confidence calculation from similarity scores
- Handles contradictory evidence

**Testing Strategy:**
- Test prompt construction with various evidence
- Test response parsing (valid/invalid JSON)
- Test confidence calculation
- Mock LLM responses for deterministic tests

---

### 5. RAG Pipeline Orchestrator

**Purpose:** Orchestrate the complete RAG pipeline from claim to verdict.

**Implementation:**
```python
# ml-service/services/rag_pipeline.py

from typing import Dict, Any
from pydantic import BaseModel
from .claim_extractor import ClaimExtractor, ExtractedClaim
from .fact_base_manager import FactBaseManager
from .vector_retriever import VectorRetriever, RetrievedFact
from .llm_comparator import LLMComparator, ComparisonResult
import time

class RAGResponse(BaseModel):
    """Complete RAG pipeline response"""
    claim: str
    extracted_claim: ExtractedClaim
    verdict: str
    confidence: float
    explanation: str
    reasoning: str
    evidence: List[Dict[str, Any]]
    sources: List[str]
    metadata: Dict[str, Any]

class RAGPipeline:
    """Complete RAG pipeline orchestrator"""
    
    def __init__(
        self,
        claim_extractor: ClaimExtractor,
        fact_base_manager: FactBaseManager,
        vector_retriever: VectorRetriever,
        llm_comparator: LLMComparator
    ):
        self.claim_extractor = claim_extractor
        self.fact_base_manager = fact_base_manager
        self.vector_retriever = vector_retriever
        self.llm_comparator = llm_comparator
    
    async def verify(self, input_text: str) -> RAGResponse:
        """Execute complete RAG pipeline"""
        
        start_time = time.time()
        metadata = {}
        
        # Stage 1: Claim Extraction
        print("🔍 Stage 1: Extracting claims...")
        t1 = time.time()
        extracted_claim = self.claim_extractor.extract(input_text)
        metadata['extraction_time'] = time.time() - t1
        
        # Stage 2: Vector Retrieval
        print("🔍 Stage 2: Retrieving similar facts...")
        t2 = time.time()
        retrieved_facts = self.vector_retriever.retrieve(extracted_claim.text)
        metadata['retrieval_time'] = time.time() - t2
        metadata['facts_retrieved'] = len(retrieved_facts)
        
        # Stage 3: LLM Comparison
        print("🔍 Stage 3: Comparing with evidence...")
        t3 = time.time()
        comparison = self.llm_comparator.compare(
            extracted_claim.text,
            retrieved_facts
        )
        metadata['comparison_time'] = time.time() - t3
        
        # Format response
        metadata['total_time'] = time.time() - start_time
        
        evidence = [
            {
                "claim": fact.fact.claim,
                "similarity": fact.similarity,
                "source_url": fact.fact.source_url,
                "publication_date": fact.fact.publication_date,
                "category": fact.fact.category
            }
            for fact in retrieved_facts
        ]
        
        sources = [fact.fact.source_url for fact in retrieved_facts]
        
        return RAGResponse(
            claim=input_text,
            extracted_claim=extracted_claim,
            verdict=comparison.verdict,
            confidence=comparison.confidence,
            explanation=comparison.explanation,
            reasoning=comparison.reasoning,
            evidence=evidence,
            sources=sources,
            metadata=metadata
        )
```

**Key Features:**
- Orchestrates all pipeline stages
- Tracks timing for each stage
- Handles errors gracefully
- Returns comprehensive response
- Logs pipeline execution

---

## Data Models

### Fact Base Schema

```json
{
  "id": "pib-2024-001",
  "claim": "The Indian government announced free electricity to all farmers starting July 2025",
  "source_url": "https://pib.gov.in/PressReleaseIframePage.aspx?PRID=123456",
  "publication_date": "2024-01-15",
  "category": "Agriculture",
  "metadata": {
    "ministry": "Ministry of Agriculture",
    "tags": ["electricity", "farmers", "subsidy"],
    "region": "National"
  },
  "embedding": [0.123, -0.456, ...] // 384-dim vector
}
```

### API Request/Response

**Request:**
```json
{
  "claim": "The Indian government announced free electricity to all farmers starting July 2025"
}
```

**Response:**
```json
{
  "claim": "The Indian government announced free electricity to all farmers starting July 2025",
  "extracted_claim": {
    "text": "The Indian government announced free electricity to all farmers starting July 2025",
    "entities": {
      "ORG": ["Indian government"],
      "DATE": ["July 2025"],
      "PRODUCT": ["electricity"]
    },
    "confidence": 1.0
  },
  "verdict": "true",
  "confidence": 0.92,
  "explanation": "The claim is supported by Evidence 1 from PIB dated 2024-01-15...",
  "reasoning": "Step 1: Analyzed the claim structure...",
  "evidence": [
    {
      "claim": "Government announces free power for farmers from July 2025",
      "similarity": 0.94,
      "source_url": "https://pib.gov.in/...",
      "publication_date": "2024-01-15",
      "category": "Agriculture"
    }
  ],
  "sources": ["https://pib.gov.in/..."],
  "metadata": {
    "extraction_time": 0.123,
    "retrieval_time": 0.045,
    "comparison_time": 1.234,
    "total_time": 1.402,
    "facts_retrieved": 3
  }
}
```

## Correctness Properties

### Property 1: Claim Extraction Consistency
**Validates: Requirement 1**

**Property:** For any input text, the extracted claim must be non-empty and contain the core factual statement.

```python
@given(st.text(min_size=10, max_size=1000))
def test_claim_extraction_non_empty(text):
    extractor = ClaimExtractor()
    result = extractor.extract(text)
    assert result.text is not None
    assert len(result.text.strip()) > 0
```

### Property 2: Similarity Score Range
**Validates: Requirement 4**

**Property:** All similarity scores must be between 0.0 and 1.0 inclusive.

```python
@given(st.text(min_size=10))
def test_similarity_scores_in_range(claim):
    retriever = VectorRetriever(facts, embedding_model)
    results = retriever.retrieve(claim)
    for result in results:
        assert 0.0 <= result.similarity <= 1.0
```

### Property 3: Verdict Validity
**Validates: Requirement 5**

**Property:** The verdict must always be one of: "true", "false", or "unverifiable".

```python
@given(st.text(min_size=10), st.lists(st.from_type(RetrievedFact)))
def test_verdict_validity(claim, evidence):
    comparator = LLMComparator(llm_client)
    result = comparator.compare(claim, evidence)
    assert result.verdict in ["true", "false", "unverifiable"]
```

### Property 4: Evidence Threshold
**Validates: Requirement 4**

**Property:** All retrieved facts must have similarity >= threshold.

```python
def test_evidence_above_threshold():
    threshold = 0.3
    retriever = VectorRetriever(facts, embedding_model, similarity_threshold=threshold)
    results = retriever.retrieve("test claim")
    for result in results:
        assert result.similarity >= threshold
```

### Property 5: Response Completeness
**Validates: Requirement 6**

**Property:** RAG response must contain all required fields.

```python
def test_response_completeness():
    pipeline = RAGPipeline(extractor, manager, retriever, comparator)
    response = pipeline.verify("test claim")
    assert response.claim is not None
    assert response.verdict in ["true", "false", "unverifiable"]
    assert 0.0 <= response.confidence <= 1.0
    assert response.explanation is not None
    assert isinstance(response.evidence, list)
    assert isinstance(response.sources, list)
```

## Performance Optimization

### 1. Embedding Caching
- Cache fact embeddings in JSON
- Load cached embeddings on startup
- Only regenerate if facts change

### 2. Vector Index Optimization
- Use ChromaDB with HNSW index
- Batch embedding generation
- Persistent storage for fast restarts

### 3. LLM Response Caching
- Cache LLM responses by claim hash
- Use Redis for distributed caching
- TTL: 1 hour

### 4. Async Processing
- Use async/await for I/O operations
- Parallel embedding generation
- Non-blocking LLM calls

## Error Handling Strategy

### Exception Hierarchy
```python
class RAGError(Exception):
    """Base exception for RAG pipeline"""
    pass

class ClaimExtractionError(RAGError):
    """Failed to extract claims"""
    pass

class FactBaseError(RAGError):
    """Fact base loading/validation failed"""
    pass

class RetrievalError(RAGError):
    """Vector retrieval failed"""
    pass

class LLMError(RAGError):
    """LLM API call failed"""
    pass
```

### Fallback Behavior
1. **Claim Extraction Fails** → Use original text as claim
2. **No Facts Retrieved** → Return "unverifiable" verdict
3. **LLM Timeout** → Retry with exponential backoff (3 attempts)
4. **LLM Parse Error** → Return raw response with "uncertain" verdict

## Testing Strategy

### Unit Tests
- Test each component independently
- Mock external dependencies (LLM, file I/O)
- Test edge cases and error conditions
- Target: >80% code coverage

### Integration Tests
- Test end-to-end RAG pipeline
- Use sample PIB data
- Test with real embeddings
- Verify response schema

### Property-Based Tests
- Use Hypothesis for invariant testing
- Test with random inputs
- Verify correctness properties
- Catch edge cases automatically

### Performance Tests
- Benchmark each pipeline stage
- Test with various fact base sizes
- Measure latency under load
- Verify performance targets

## Deployment Configuration

### Environment Variables
```bash
# Vector Database
VECTOR_DB=chromadb  # or faiss
SIMILARITY_THRESHOLD=0.3
TOP_K_RESULTS=5

# Embeddings
EMBEDDING_PROVIDER=sentence-transformers
EMBEDDING_MODEL=all-MiniLM-L6-v2

# Claim Extraction
CLAIM_EXTRACTION_MODEL=en_core_web_sm

# LLM
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
MODEL_NAME=gemini-2.5-flash

# Performance
CACHE_EMBEDDINGS=true
ENABLE_REDIS_CACHE=false
```

### Docker Compose Updates
```yaml
ml-service:
  environment:
    - VECTOR_DB=chromadb
    - SIMILARITY_THRESHOLD=0.3
    - TOP_K_RESULTS=5
  volumes:
    - ./ml-service/data:/app/data
    - ./ml-service/models:/app/models
```

## Implementation Phases

### Phase 1: Core Components (Priority 1)
1. FactBaseManager - Load and validate facts
2. ClaimExtractor - Basic spaCy extraction
3. VectorRetriever - ChromaDB integration
4. LLMComparator - Evidence-based prompting

### Phase 2: Integration (Priority 2)
1. RAGPipeline - Orchestrate components
2. FastAPI endpoint - `/rag/verify`
3. Error handling - Exception hierarchy
4. Logging - Pipeline execution tracking

### Phase 3: Frontend (Priority 3)
1. Update response schema
2. Display extracted claims
3. Show evidence with similarity scores
4. Update loading messages

### Phase 4: Testing (Priority 4)
1. Unit tests for each component
2. Integration tests for pipeline
3. Property-based tests
4. Performance benchmarks

### Phase 5: Documentation (Priority 5)
1. Update README
2. API documentation
3. Sample data
4. Video walkthrough

## Success Metrics

- ✅ All 13 requirements implemented
- ✅ Test coverage > 80%
- ✅ Performance targets met:
  - Claim extraction: < 500ms
  - Vector retrieval: < 200ms
  - LLM comparison: < 2s
  - Total pipeline: < 5s
- ✅ Code quality:
  - PEP 8 compliant
  - Type hints on all functions
  - Docstrings for all classes/methods
- ✅ Documentation complete
- ✅ Video walkthrough recorded
