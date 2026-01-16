"""
RAG Pipeline Orchestrator for end-to-end fact verification.

This module orchestrates the complete RAG (Retrieval-Augmented Generation) pipeline:
1. Claim Extraction - Extract factual claims from input text
2. Vector Retrieval - Find similar facts using semantic search
3. LLM Comparison - Compare claim against evidence using LLM reasoning
4. Response Formatting - Return comprehensive structured response

The pipeline tracks timing for each stage and handles errors gracefully with fallbacks.
"""

import time
import logging
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from services.claim_extractor import ClaimExtractor, ExtractedClaim, ClaimExtractionError
from services.fact_base_manager import FactBaseManager, FactBaseError
from services.vector_retriever import VectorRetriever, RetrievedFact, RetrievalError
from services.llm_comparator import LLMComparator, ComparisonResult, LLMError

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RAGResponse(BaseModel):
    """
    Complete RAG pipeline response with all verification details.
    
    This response includes the original claim, extracted claim with entities,
    verdict with reasoning, retrieved evidence with similarity scores, and
    metadata about pipeline execution timing.
    
    Attributes:
        claim: Original input text from user
        extracted_claim: Structured claim with entities from ClaimExtractor
        verdict: Classification as "true", "false", or "unverifiable"
        confidence: Confidence score from 0.0 to 1.0
        explanation: Human-readable explanation referencing evidence
        reasoning: Step-by-step reasoning process from LLM
        evidence: List of retrieved facts with similarity scores and sources
        sources: List of PIB source URLs
        metadata: Pipeline execution metadata (timing, counts, etc.)
    """
    claim: str = Field(..., description="Original input text")
    extracted_claim: ExtractedClaim = Field(..., description="Extracted claim with entities")
    verdict: str = Field(
        ...,
        description="Verdict: 'true', 'false', or 'unverifiable'",
        pattern="^(true|false|unverifiable)$"
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score between 0.0 and 1.0"
    )
    explanation: str = Field(..., description="Clear explanation referencing evidence")
    reasoning: str = Field(..., description="Step-by-step reasoning process")
    evidence: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Retrieved facts with similarity scores and metadata"
    )
    sources: List[str] = Field(
        default_factory=list,
        description="PIB source URLs for evidence"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Pipeline execution metadata (timing, counts)"
    )


class RAGPipelineError(Exception):
    """Raised when RAG pipeline execution fails."""
    pass


class RAGPipeline:
    """
    Complete RAG pipeline orchestrator for fact verification.
    
    This class orchestrates all components of the RAG pipeline in sequence:
    1. ClaimExtractor - Extracts claims and entities using spaCy NER
    2. VectorRetriever - Finds similar facts using ChromaDB semantic search
    3. LLMComparator - Compares claim against evidence using LLM reasoning
    
    The pipeline tracks timing for each stage, handles errors gracefully with
    fallbacks, and returns a comprehensive response with evidence and sources.
    
    Features:
        - End-to-end orchestration of all RAG components
        - Detailed timing metrics for each pipeline stage
        - Graceful error handling with informative fallbacks
        - Comprehensive logging of pipeline execution
        - Structured response with evidence and reasoning
    
    Example:
        >>> # Initialize components
        >>> claim_extractor = ClaimExtractor()
        >>> fact_base_manager = FactBaseManager()
        >>> facts = fact_base_manager.load()
        >>> vector_retriever = VectorRetriever(facts, fact_base_manager.embedding_model)
        >>> llm_comparator = LLMComparator(llm_client)
        >>> 
        >>> # Create pipeline
        >>> pipeline = RAGPipeline(
        ...     claim_extractor,
        ...     fact_base_manager,
        ...     vector_retriever,
        ...     llm_comparator
        ... )
        >>> 
        >>> # Verify a claim
        >>> response = pipeline.verify("Government announced free electricity to farmers")
        >>> print(f"Verdict: {response.verdict}")
        >>> print(f"Confidence: {response.confidence:.2f}")
        >>> print(f"Evidence: {len(response.evidence)} facts")
    """
    
    def __init__(
        self,
        claim_extractor: ClaimExtractor,
        fact_base_manager: FactBaseManager,
        vector_retriever: VectorRetriever,
        llm_comparator: LLMComparator
    ):
        """
        Initialize the RAG pipeline with all required components.
        
        Args:
            claim_extractor: Initialized ClaimExtractor for claim/entity extraction
            fact_base_manager: Initialized FactBaseManager with loaded facts
            vector_retriever: Initialized VectorRetriever with indexed facts
            llm_comparator: Initialized LLMComparator with LLM client
            
        Raises:
            RAGPipelineError: If any component is None or invalid
        """
        if not claim_extractor:
            raise RAGPipelineError("ClaimExtractor cannot be None")
        if not fact_base_manager:
            raise RAGPipelineError("FactBaseManager cannot be None")
        if not vector_retriever:
            raise RAGPipelineError("VectorRetriever cannot be None")
        if not llm_comparator:
            raise RAGPipelineError("LLMComparator cannot be None")
        
        self.claim_extractor = claim_extractor
        self.fact_base_manager = fact_base_manager
        self.vector_retriever = vector_retriever
        self.llm_comparator = llm_comparator
        
        logger.info("✅ RAGPipeline initialized with all components")
    
    def verify(self, input_text: str) -> RAGResponse:
        """
        Execute complete RAG pipeline to verify a claim.
        
        This method orchestrates the full verification pipeline:
        1. Extract claim and entities from input text
        2. Retrieve similar facts from vector database
        3. Compare claim against evidence using LLM
        4. Format comprehensive response with timing metadata
        
        The pipeline handles errors gracefully at each stage:
        - Claim extraction fails → use original text as claim
        - No facts retrieved → return "unverifiable" verdict
        - LLM comparison fails → return error with partial results
        
        Args:
            input_text: The claim text to verify
            
        Returns:
            RAGResponse with verdict, evidence, reasoning, and metadata
            
        Raises:
            RAGPipelineError: If pipeline execution fails critically
            
        Example:
            >>> response = pipeline.verify("PM announced ₹5000 crore for farmers")
            >>> print(f"Verdict: {response.verdict}")
            >>> print(f"Found {len(response.evidence)} supporting facts")
            >>> print(f"Total time: {response.metadata['total_time']:.2f}s")
        """
        # Validate input
        if not input_text or not isinstance(input_text, str):
            raise RAGPipelineError("Input text must be a non-empty string")
        
        input_text = input_text.strip()
        if len(input_text) == 0:
            raise RAGPipelineError("Input text cannot be empty or whitespace only")
        
        logger.info("=" * 80)
        logger.info(f"🚀 Starting RAG Pipeline for claim: '{input_text[:100]}...'")
        logger.info("=" * 80)
        
        start_time = time.time()
        metadata: Dict[str, Any] = {}
        
        # Stage 1: Claim Extraction
        try:
            logger.info("📝 Stage 1: Extracting claims and entities...")
            t1 = time.time()
            extracted_claim = self.claim_extractor.extract(input_text)
            extraction_time = time.time() - t1
            metadata['extraction_time'] = round(extraction_time, 3)
            
            logger.info(f"✅ Claim extracted in {extraction_time:.3f}s")
            logger.info(f"   Entities found: {len(extracted_claim.entities)} types")
            logger.info(f"   Confidence: {extracted_claim.confidence:.2f}")
            
        except ClaimExtractionError as e:
            logger.warning(f"⚠️ Claim extraction failed: {e}")
            logger.info("   Fallback: Using original text as claim")
            
            # Fallback: use original text as claim
            extracted_claim = ExtractedClaim(
                text=input_text,
                entities={},
                confidence=0.5
            )
            metadata['extraction_time'] = 0.0
            metadata['extraction_error'] = str(e)
        
        # Stage 2: Vector Retrieval
        try:
            logger.info("🔍 Stage 2: Retrieving similar facts from vector database...")
            t2 = time.time()
            retrieved_facts = self.vector_retriever.retrieve(extracted_claim.text)
            retrieval_time = time.time() - t2
            metadata['retrieval_time'] = round(retrieval_time, 3)
            metadata['facts_retrieved'] = len(retrieved_facts)
            
            logger.info(f"✅ Retrieved {len(retrieved_facts)} facts in {retrieval_time:.3f}s")
            
            if retrieved_facts:
                similarities = [f.similarity for f in retrieved_facts]
                logger.info(
                    f"   Similarity range: {min(similarities):.3f} - {max(similarities):.3f}"
                )
            else:
                logger.info("   No facts found above similarity threshold")
            
        except RetrievalError as e:
            logger.error(f"❌ Vector retrieval failed: {e}")
            
            # Return unverifiable if retrieval fails
            metadata['retrieval_time'] = 0.0
            metadata['retrieval_error'] = str(e)
            metadata['total_time'] = round(time.time() - start_time, 3)
            
            return RAGResponse(
                claim=input_text,
                extracted_claim=extracted_claim,
                verdict="unverifiable",
                confidence=0.0,
                explanation="Failed to retrieve facts from the database due to a technical error.",
                reasoning=f"Vector retrieval error: {str(e)}",
                evidence=[],
                sources=[],
                metadata=metadata
            )
        
        # Stage 3: LLM Comparison
        try:
            logger.info("🤖 Stage 3: Comparing claim against evidence using LLM...")
            t3 = time.time()
            comparison = self.llm_comparator.compare(
                extracted_claim.text,
                retrieved_facts
            )
            comparison_time = time.time() - t3
            metadata['comparison_time'] = round(comparison_time, 3)
            
            logger.info(f"✅ LLM comparison completed in {comparison_time:.3f}s")
            logger.info(f"   Verdict: {comparison.verdict}")
            logger.info(f"   Confidence: {comparison.confidence:.2f}")
            
        except LLMError as e:
            logger.error(f"❌ LLM comparison failed: {e}")
            
            # Return unverifiable if LLM fails
            metadata['comparison_time'] = 0.0
            metadata['comparison_error'] = str(e)
            metadata['total_time'] = round(time.time() - start_time, 3)
            
            # Format evidence even if LLM failed
            evidence = self._format_evidence(retrieved_facts)
            sources = [fact.fact.source for fact in retrieved_facts]
            
            return RAGResponse(
                claim=input_text,
                extracted_claim=extracted_claim,
                verdict="unverifiable",
                confidence=0.0,
                explanation="Failed to analyze evidence due to LLM error.",
                reasoning=f"LLM comparison error: {str(e)}",
                evidence=evidence,
                sources=sources,
                metadata=metadata
            )
        
        # Stage 4: Format Response
        logger.info("📦 Stage 4: Formatting response...")
        
        # Format evidence with all details
        evidence = self._format_evidence(retrieved_facts)
        
        # Extract unique sources
        sources = list(set(fact.fact.source for fact in retrieved_facts))
        
        # Calculate total time
        total_time = time.time() - start_time
        metadata['total_time'] = round(total_time, 3)
        
        # Add additional metadata
        metadata['pipeline_version'] = '1.0'
        metadata['fact_base_size'] = len(self.fact_base_manager.get_facts())
        
        logger.info("=" * 80)
        logger.info(f"✅ RAG Pipeline completed in {total_time:.3f}s")
        logger.info(f"   Verdict: {comparison.verdict}")
        logger.info(f"   Confidence: {comparison.confidence:.2f}")
        logger.info(f"   Evidence: {len(evidence)} facts")
        logger.info(f"   Sources: {len(sources)} unique PIB URLs")
        logger.info("=" * 80)
        
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
    
    def _format_evidence(self, retrieved_facts: List[RetrievedFact]) -> List[Dict[str, Any]]:
        """
        Format retrieved facts into evidence dictionaries.
        
        Each evidence item includes:
        - claim: The fact claim text
        - similarity: Similarity score (0.0 to 1.0)
        - source_url: PIB source URL
        - publication_date: Date of publication
        - category: Fact category
        - metadata: Additional fact metadata
        
        Args:
            retrieved_facts: List of RetrievedFact objects from vector retrieval
            
        Returns:
            List of formatted evidence dictionaries
        """
        evidence = []
        
        for retrieved_fact in retrieved_facts:
            fact = retrieved_fact.fact
            
            evidence_item = {
                "claim": fact.claim,
                "similarity": round(retrieved_fact.similarity, 3),
                "source_url": fact.source,
                "publication_date": fact.publication_date,
                "category": fact.category
            }
            
            # Add metadata if available
            if fact.metadata:
                evidence_item["metadata"] = fact.metadata
            
            evidence.append(evidence_item)
        
        return evidence
    
    def get_pipeline_info(self) -> Dict[str, Any]:
        """
        Get information about the pipeline configuration.
        
        Returns:
            Dictionary with pipeline component information
        """
        return {
            "components": {
                "claim_extractor": type(self.claim_extractor).__name__,
                "fact_base_manager": type(self.fact_base_manager).__name__,
                "vector_retriever": type(self.vector_retriever).__name__,
                "llm_comparator": type(self.llm_comparator).__name__
            },
            "configuration": {
                "fact_base_size": len(self.fact_base_manager.get_facts()),
                "similarity_threshold": self.vector_retriever.similarity_threshold,
                "top_k": self.vector_retriever.top_k,
                "embedding_model": self.fact_base_manager.embedding_model_name
            }
        }
