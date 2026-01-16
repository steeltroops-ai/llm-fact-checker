"""
Vector retrieval module for RAG pipeline.

This module provides vector-based fact retrieval using ChromaDB for semantic search.
It finds the most similar facts to a given claim using cosine similarity on embeddings.
"""

import time
from typing import List, Optional
import logging
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings

from schemas.fact_schema import Fact

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RetrievedFact(BaseModel):
    """
    A fact retrieved from the vector database with its similarity score.
    
    Attributes:
        fact: The retrieved Fact object
        similarity: Cosine similarity score (0.0 to 1.0)
    """
    fact: Fact = Field(..., description="Retrieved fact from the database")
    similarity: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Cosine similarity score"
    )


class RetrievalError(Exception):
    """Raised when vector retrieval fails."""
    pass


class VectorRetriever:
    """
    Retrieve similar facts using vector similarity search.
    
    This class uses ChromaDB to perform efficient semantic search over
    the fact base. It generates embeddings for input claims and retrieves
    the most similar facts based on cosine similarity.
    
    Features:
        - ChromaDB for persistent vector storage with HNSW indexing
        - Configurable similarity threshold to filter irrelevant results
        - Configurable top-k to limit number of results
        - Cosine similarity metric for semantic matching
        - Detailed logging of retrieval metrics
    
    Example:
        >>> facts = fact_base_manager.get_facts()
        >>> embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
        >>> retriever = VectorRetriever(facts, embedding_model)
        >>> results = retriever.retrieve("Government announced free electricity")
        >>> for result in results:
        ...     print(f"Similarity: {result.similarity:.2f} - {result.fact.claim}")
    """
    
    def __init__(
        self,
        facts: List[Fact],
        embedding_model: SentenceTransformer,
        similarity_threshold: float = 0.3,
        top_k: int = 5,
        use_chromadb: bool = True
    ):
        """
        Initialize the vector retriever.
        
        Args:
            facts: List of facts with embeddings to index
            embedding_model: Sentence transformer model for generating embeddings
            similarity_threshold: Minimum similarity score to return (0.0 to 1.0)
            top_k: Maximum number of facts to retrieve
            use_chromadb: Whether to use ChromaDB (True) or fallback to FAISS (False)
            
        Raises:
            RetrievalError: If initialization fails
        """
        if not facts:
            raise RetrievalError("Cannot initialize retriever with empty fact list")
        
        if not all(fact.embedding for fact in facts):
            raise RetrievalError("All facts must have embeddings")
        
        if not 0.0 <= similarity_threshold <= 1.0:
            raise RetrievalError(f"Similarity threshold must be between 0.0 and 1.0, got {similarity_threshold}")
        
        if top_k < 1:
            raise RetrievalError(f"top_k must be at least 1, got {top_k}")
        
        self.facts = facts
        self.embedding_model = embedding_model
        self.similarity_threshold = similarity_threshold
        self.top_k = top_k
        self.use_chromadb = use_chromadb
        
        # Initialize vector database
        if use_chromadb:
            self._init_chromadb()
        else:
            raise NotImplementedError("FAISS support not yet implemented")
        
        logger.info(
            f"✅ VectorRetriever initialized with {len(facts)} facts, "
            f"threshold={similarity_threshold}, top_k={top_k}"
        )
    
    def _init_chromadb(self) -> None:
        """
        Initialize ChromaDB collection with facts.
        
        This method:
        1. Creates a ChromaDB client with cosine similarity
        2. Creates or gets a collection for the fact base
        3. Adds all facts with their embeddings to the collection
        
        ChromaDB uses HNSW (Hierarchical Navigable Small World) indexing
        for efficient approximate nearest neighbor search.
        
        Raises:
            RetrievalError: If ChromaDB initialization fails
        """
        try:
            logger.info("🔄 Initializing ChromaDB collection...")
            
            # Create ChromaDB client with cosine similarity
            self.client = chromadb.Client(
                Settings(
                    anonymized_telemetry=False,
                    allow_reset=True
                )
            )
            
            # Try to delete existing collection to start fresh
            try:
                self.client.delete_collection(name="fact_base")
            except Exception:
                pass  # Collection doesn't exist, which is fine
            
            # Create collection with cosine similarity
            self.collection = self.client.create_collection(
                name="fact_base",
                metadata={"hnsw:space": "cosine"}
            )
            
            # Prepare data for batch insertion
            ids = []
            embeddings = []
            documents = []
            metadatas = []
            
            for fact in self.facts:
                ids.append(fact.id)
                embeddings.append(fact.embedding)
                documents.append(fact.claim)
                metadatas.append({
                    "source": fact.source,
                    "category": fact.category,
                    "publication_date": fact.publication_date
                })
            
            # Add all facts to collection in batch
            self.collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas
            )
            
            logger.info(f"✅ ChromaDB initialized with {len(self.facts)} facts")
            
        except Exception as e:
            raise RetrievalError(f"Failed to initialize ChromaDB: {str(e)}") from e
    
    def retrieve(self, claim: str) -> List[RetrievedFact]:
        """
        Retrieve top-K similar facts for a given claim.
        
        This method:
        1. Generates an embedding for the input claim
        2. Queries ChromaDB for similar facts using cosine similarity
        3. Filters results by similarity threshold
        4. Returns facts sorted by similarity (highest first)
        
        Args:
            claim: The claim text to find similar facts for
            
        Returns:
            List of RetrievedFact objects with similarity scores >= threshold,
            sorted by similarity (highest first). Returns empty list if no
            facts meet the threshold.
            
        Raises:
            RetrievalError: If retrieval fails or input is invalid
            
        Example:
            >>> results = retriever.retrieve("PM announced farmer subsidies")
            >>> if results:
            ...     print(f"Found {len(results)} similar facts")
            ...     print(f"Best match: {results[0].similarity:.2f}")
            ... else:
            ...     print("No similar facts found")
        """
        # Validate input
        if not claim or not isinstance(claim, str):
            raise RetrievalError("Claim must be a non-empty string")
        
        claim = claim.strip()
        if len(claim) == 0:
            raise RetrievalError("Claim cannot be empty or whitespace only")
        
        start_time = time.time()
        
        try:
            # Generate embedding for the claim
            logger.info(f"🔍 Generating embedding for claim: '{claim[:100]}...'")
            claim_embedding = self.embedding_model.encode(
                [claim],
                convert_to_numpy=True,
                show_progress_bar=False
            )[0]
            
            # Query ChromaDB for similar facts
            logger.info(f"🔍 Querying ChromaDB for top-{self.top_k} similar facts...")
            results = self.collection.query(
                query_embeddings=[claim_embedding.tolist()],
                n_results=self.top_k
            )
            
            # Parse results and filter by threshold
            retrieved_facts = []
            
            if results['ids'] and results['ids'][0]:
                for i, fact_id in enumerate(results['ids'][0]):
                    # ChromaDB returns distances, convert to similarity
                    # For cosine distance: similarity = 1 - distance
                    distance = results['distances'][0][i]
                    similarity = 1.0 - distance
                    
                    # Filter by threshold
                    if similarity >= self.similarity_threshold:
                        # Find the corresponding fact
                        fact = next((f for f in self.facts if f.id == fact_id), None)
                        
                        if fact:
                            retrieved_facts.append(
                                RetrievedFact(
                                    fact=fact,
                                    similarity=similarity
                                )
                            )
            
            # Calculate metrics
            query_time = time.time() - start_time
            
            # Log retrieval metrics
            logger.info(
                f"✅ Retrieved {len(retrieved_facts)} facts above threshold "
                f"{self.similarity_threshold} in {query_time:.3f}s"
            )
            
            if retrieved_facts:
                logger.info(
                    f"   Top similarity: {retrieved_facts[0].similarity:.3f}, "
                    f"Lowest: {retrieved_facts[-1].similarity:.3f}"
                )
            else:
                logger.info(
                    f"   No facts found above threshold {self.similarity_threshold}"
                )
            
            return retrieved_facts
            
        except Exception as e:
            raise RetrievalError(f"Failed to retrieve similar facts: {str(e)}") from e
    
    def retrieve_by_id(self, fact_id: str) -> Optional[RetrievedFact]:
        """
        Retrieve a specific fact by its ID.
        
        Args:
            fact_id: The unique identifier of the fact
            
        Returns:
            RetrievedFact with similarity 1.0 if found, None otherwise
        """
        fact = next((f for f in self.facts if f.id == fact_id), None)
        if fact:
            return RetrievedFact(fact=fact, similarity=1.0)
        return None
    
    def get_statistics(self) -> dict:
        """
        Get statistics about the vector retriever.
        
        Returns:
            Dictionary with retriever statistics
        """
        return {
            "total_facts": len(self.facts),
            "similarity_threshold": self.similarity_threshold,
            "top_k": self.top_k,
            "embedding_dimension": len(self.facts[0].embedding) if self.facts else 0,
            "vector_db": "chromadb" if self.use_chromadb else "faiss",
            "categories": self._get_category_distribution()
        }
    
    def _get_category_distribution(self) -> dict:
        """Get distribution of facts by category."""
        distribution = {}
        for fact in self.facts:
            category = fact.category
            distribution[category] = distribution.get(category, 0) + 1
        return distribution
