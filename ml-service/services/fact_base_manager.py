"""
Fact Base Manager for loading, validating, and managing PIB facts with embeddings.

This module provides the FactBaseManager class that handles:
- Loading fact base from JSON with schema validation
- Generating embeddings for facts using sentence-transformers
- Caching embeddings to avoid recomputation
- Providing access to facts for vector retrieval
"""

import json
import time
from pathlib import Path
from typing import List, Optional
from sentence_transformers import SentenceTransformer
import logging

from schemas.fact_schema import Fact, FactBase, FactSchema

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class FactBaseError(Exception):
    """Exception raised for fact base loading or validation errors."""
    pass


class FactBaseManager:
    """
    Manage fact base loading, validation, and embeddings.
    
    This class handles the complete lifecycle of the fact base:
    1. Load facts from JSON file
    2. Validate against schema
    3. Generate embeddings for facts without them
    4. Cache embeddings back to file
    5. Provide access to facts for retrieval
    
    Attributes:
        fact_base_path: Path to the fact_base.json file
        embedding_model_name: Name of the sentence-transformers model
        cache_embeddings: Whether to save embeddings back to file
        facts: List of loaded and validated facts
        embedding_model: Loaded sentence-transformers model
    """
    
    def __init__(
        self,
        fact_base_path: str = "data/fact_base.json",
        embedding_model_name: str = "all-MiniLM-L6-v2",
        cache_embeddings: bool = True
    ):
        """
        Initialize the FactBaseManager.
        
        Args:
            fact_base_path: Path to the fact base JSON file (relative to ml-service/)
            embedding_model_name: Name of the sentence-transformers model to use
            cache_embeddings: Whether to save generated embeddings back to file
        """
        self.fact_base_path = Path(fact_base_path)
        self.embedding_model_name = embedding_model_name
        self.cache_embeddings = cache_embeddings
        self.facts: List[Fact] = []
        self.embedding_model: Optional[SentenceTransformer] = None
        
    def load(self) -> List[Fact]:
        """
        Load and validate fact base from JSON file.
        
        This method:
        1. Loads the JSON file
        2. Validates against the FactBase schema
        3. Initializes the embedding model
        4. Ensures all facts have embeddings
        5. Logs statistics about the loaded fact base
        
        Returns:
            List of validated Fact objects with embeddings
            
        Raises:
            FactBaseError: If file doesn't exist, is invalid JSON, or fails validation
        """
        start_time = time.time()
        
        logger.info(f"📚 Loading fact base from {self.fact_base_path}")
        
        # Check if file exists
        if not self.fact_base_path.exists():
            raise FactBaseError(
                f"Fact base file not found: {self.fact_base_path}. "
                f"Please ensure the file exists and contains valid PIB facts."
            )
        
        # Load JSON data
        try:
            with open(self.fact_base_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            raise FactBaseError(
                f"Invalid JSON in fact base file: {e}. "
                f"Please check the file format."
            )
        except Exception as e:
            raise FactBaseError(f"Error reading fact base file: {e}")
        
        # Validate against schema
        try:
            fact_base = FactSchema.validate_fact_base(data)
            self.facts = fact_base.facts
        except Exception as e:
            raise FactBaseError(
                f"Fact base validation failed: {e}. "
                f"Please ensure all facts match the required schema."
            )
        
        logger.info(f"✅ Loaded {len(self.facts)} facts from fact base")
        
        # Initialize embedding model
        logger.info(f"🔄 Loading embedding model: {self.embedding_model_name}")
        try:
            self.embedding_model = SentenceTransformer(self.embedding_model_name)
        except Exception as e:
            raise FactBaseError(f"Failed to load embedding model: {e}")
        
        # Ensure all facts have embeddings
        self._ensure_embeddings()
        
        # Log statistics
        load_time = time.time() - start_time
        embedding_dim = len(self.facts[0].embedding) if self.facts else 0
        
        logger.info(f"📊 Fact Base Statistics:")
        logger.info(f"   - Total facts: {len(self.facts)}")
        logger.info(f"   - Embedding dimensions: {embedding_dim}")
        logger.info(f"   - Load time: {load_time:.2f}s")
        logger.info(f"   - Categories: {self._get_category_counts()}")
        
        return self.facts
    
    def _ensure_embeddings(self) -> None:
        """
        Generate embeddings for facts that don't have them.
        
        This method:
        1. Identifies facts without embeddings (all zeros or wrong dimension)
        2. Generates embeddings using sentence-transformers
        3. Updates the facts with new embeddings
        4. Saves back to file if caching is enabled
        
        Embeddings are considered missing if:
        - The embedding list is all zeros
        - The embedding dimension is incorrect (not 384)
        """
        # Check which facts need embeddings
        facts_without_embeddings = []
        for fact in self.facts:
            if not fact.embedding or len(fact.embedding) != 384:
                facts_without_embeddings.append(fact)
            elif all(x == 0.0 for x in fact.embedding):
                # All zeros means placeholder embedding
                facts_without_embeddings.append(fact)
        
        if not facts_without_embeddings:
            logger.info("✅ All facts have valid embeddings")
            return
        
        logger.info(
            f"🔄 Generating embeddings for {len(facts_without_embeddings)} facts "
            f"(out of {len(self.facts)} total)..."
        )
        
        try:
            # Extract claims for embedding generation
            claims = [fact.claim for fact in facts_without_embeddings]
            
            # Generate embeddings in batch
            embeddings = self.embedding_model.encode(
                claims,
                show_progress_bar=True,
                convert_to_numpy=True
            )
            
            # Update facts with new embeddings
            for fact, embedding in zip(facts_without_embeddings, embeddings):
                fact.embedding = embedding.tolist()
            
            logger.info("✅ Embeddings generated successfully")
            
            # Save back to file if caching enabled
            if self.cache_embeddings:
                self._save_with_embeddings()
                
        except Exception as e:
            raise FactBaseError(f"Failed to generate embeddings: {e}")
    
    def _save_with_embeddings(self) -> None:
        """
        Save fact base with embeddings back to JSON file.
        
        This method preserves the original structure including version
        and last_updated fields while updating the facts with embeddings.
        
        Raises:
            FactBaseError: If saving fails
        """
        try:
            logger.info(f"💾 Saving fact base with embeddings to {self.fact_base_path}")
            
            # Load original data to preserve version and metadata
            with open(self.fact_base_path, 'r', encoding='utf-8') as f:
                original_data = json.load(f)
            
            # Update facts while preserving other fields
            original_data['facts'] = [fact.model_dump() for fact in self.facts]
            
            # Write back to file with pretty formatting
            with open(self.fact_base_path, 'w', encoding='utf-8') as f:
                json.dump(original_data, f, indent=2, ensure_ascii=False)
            
            logger.info("✅ Fact base saved with embeddings")
            
        except Exception as e:
            # Don't raise error - caching is optional
            logger.warning(f"⚠️ Failed to save embeddings to file: {e}")
    
    def _get_category_counts(self) -> dict:
        """
        Get count of facts per category.
        
        Returns:
            Dictionary mapping category names to counts
        """
        category_counts = {}
        for fact in self.facts:
            category = fact.category
            category_counts[category] = category_counts.get(category, 0) + 1
        return category_counts
    
    def get_facts(self) -> List[Fact]:
        """
        Get all loaded facts.
        
        Returns:
            List of Fact objects with embeddings
            
        Raises:
            FactBaseError: If facts haven't been loaded yet
        """
        if not self.facts:
            raise FactBaseError(
                "No facts loaded. Call load() first to load the fact base."
            )
        return self.facts
    
    def get_fact_by_id(self, fact_id: str) -> Optional[Fact]:
        """
        Get a specific fact by ID.
        
        Args:
            fact_id: The unique identifier of the fact
            
        Returns:
            Fact object if found, None otherwise
        """
        for fact in self.facts:
            if fact.id == fact_id:
                return fact
        return None
    
    def get_facts_by_category(self, category: str) -> List[Fact]:
        """
        Get all facts in a specific category.
        
        Args:
            category: Category name (agriculture, health, economy, infrastructure, education)
            
        Returns:
            List of facts in the specified category
        """
        return [fact for fact in self.facts if fact.category == category]
