"""
Claim extraction module for RAG pipeline.

This module provides NLP-based claim and entity extraction using spaCy.
It identifies factual statements and extracts named entities to support
evidence-based fact verification.
"""

from typing import Dict, List
import spacy
from pydantic import BaseModel, Field


class ExtractedClaim(BaseModel):
    """
    Extracted claim with named entities.
    
    Attributes:
        text: The extracted claim text
        entities: Dictionary mapping entity types to lists of entity texts
        confidence: Confidence score for the extraction (0.0 to 1.0)
    """
    text: str = Field(..., description="Extracted claim text")
    entities: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Named entities grouped by type"
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence in extraction quality"
    )


class ClaimExtractionError(Exception):
    """Raised when claim extraction fails."""
    pass


class ClaimExtractor:
    """
    Extract factual claims and named entities from text using spaCy.
    
    This class uses spaCy's NER (Named Entity Recognition) to identify
    key entities in the input text and extracts the main claim for
    fact verification.
    
    Supported entity types:
        - ORG: Organizations (e.g., "Indian government")
        - DATE: Dates and timelines (e.g., "July 2025")
        - GPE: Geopolitical entities (e.g., "India", "Delhi")
        - PERSON: Person names
        - MONEY: Monetary values
        - CARDINAL: Numerical values
        - PERCENT: Percentages
        - PRODUCT: Products and services
    
    Example:
        >>> extractor = ClaimExtractor()
        >>> result = extractor.extract("The Indian government announced free electricity to farmers in July 2025")
        >>> print(result.text)
        "The Indian government announced free electricity to farmers in July 2025"
        >>> print(result.entities)
        {"ORG": ["Indian government"], "DATE": ["July 2025"]}
    """
    
    def __init__(self, model_name: str = "en_core_web_sm"):
        """
        Initialize the claim extractor with a spaCy model.
        
        Args:
            model_name: Name of the spaCy model to load (default: en_core_web_sm)
            
        Raises:
            ClaimExtractionError: If the spaCy model cannot be loaded
        """
        try:
            self.nlp = spacy.load(model_name)
            print(f"✅ Loaded spaCy model: {model_name}")
        except OSError as e:
            raise ClaimExtractionError(
                f"Failed to load spaCy model '{model_name}'. "
                f"Please run: python -m spacy download {model_name}"
            ) from e
    
    def extract(self, text: str) -> ExtractedClaim:
        """
        Extract the main claim and named entities from input text.
        
        This method processes the input text to identify named entities
        and returns the full text as the claim. Future enhancements may
        include sentence segmentation to extract multiple claims.
        
        Args:
            text: Input text to extract claims from
            
        Returns:
            ExtractedClaim object with text, entities, and confidence
            
        Raises:
            ClaimExtractionError: If extraction fails or input is invalid
            
        Example:
            >>> extractor = ClaimExtractor()
            >>> result = extractor.extract("PM Modi announced ₹5000 crore for farmers")
            >>> result.entities["PERSON"]
            ["Modi"]
            >>> result.entities["MONEY"]
            ["₹5000 crore"]
        """
        # Validate input
        if not text or not isinstance(text, str):
            raise ClaimExtractionError("Input text must be a non-empty string")
        
        text = text.strip()
        
        if len(text) == 0:
            raise ClaimExtractionError("Input text cannot be empty or whitespace only")
        
        # Process text with spaCy
        try:
            doc = self.nlp(text)
        except Exception as e:
            raise ClaimExtractionError(f"Failed to process text with spaCy: {str(e)}") from e
        
        # Extract named entities
        entities: Dict[str, List[str]] = {}
        
        for ent in doc.ents:
            # Focus on key entity types for fact verification
            if ent.label_ in ['ORG', 'DATE', 'GPE', 'PERSON', 'MONEY', 
                              'CARDINAL', 'PERCENT', 'PRODUCT', 'EVENT', 'LAW']:
                if ent.label_ not in entities:
                    entities[ent.label_] = []
                # Avoid duplicate entities
                if ent.text not in entities[ent.label_]:
                    entities[ent.label_].append(ent.text)
        
        # Calculate confidence based on entity extraction
        # Higher confidence if we found relevant entities
        confidence = self._calculate_confidence(text, entities)
        
        # For now, use the full input text as the claim
        # Future enhancement: implement sentence segmentation for multiple claims
        claim_text = text
        
        return ExtractedClaim(
            text=claim_text,
            entities=entities,
            confidence=confidence
        )
    
    def _calculate_confidence(self, text: str, entities: Dict[str, List[str]]) -> float:
        """
        Calculate confidence score for the extraction.
        
        Confidence is based on:
        - Presence of entities (higher confidence with more entities)
        - Text length (very short or very long text gets lower confidence)
        - Entity diversity (multiple entity types increase confidence)
        
        Args:
            text: The input text
            entities: Extracted entities dictionary
            
        Returns:
            Confidence score between 0.0 and 1.0
        """
        # Base confidence
        confidence = 0.5
        
        # Boost confidence if entities were found
        total_entities = sum(len(ents) for ents in entities.values())
        if total_entities > 0:
            # More entities = higher confidence (up to +0.3)
            entity_boost = min(0.3, total_entities * 0.1)
            confidence += entity_boost
        else:
            # No entities found = lower confidence
            confidence = 0.4
        
        # Boost confidence for entity diversity
        entity_types = len(entities)
        if entity_types >= 3:
            confidence += 0.15
        elif entity_types >= 2:
            confidence += 0.1
        elif entity_types >= 1:
            confidence += 0.05
        
        # Adjust for text length
        text_length = len(text)
        if text_length < 20:
            # Very short text might be incomplete
            confidence *= 0.8
        elif text_length > 500:
            # Very long text might be complex or contain multiple claims
            confidence *= 0.9
        
        # Ensure confidence stays in valid range
        return max(0.0, min(1.0, confidence))
    
    def extract_batch(self, texts: List[str]) -> List[ExtractedClaim]:
        """
        Extract claims from multiple texts efficiently.
        
        This method processes multiple texts in batch for better performance
        when handling multiple claims.
        
        Args:
            texts: List of input texts to process
            
        Returns:
            List of ExtractedClaim objects
            
        Raises:
            ClaimExtractionError: If batch processing fails
        """
        if not texts or not isinstance(texts, list):
            raise ClaimExtractionError("Input must be a non-empty list of texts")
        
        results = []
        for text in texts:
            try:
                result = self.extract(text)
                results.append(result)
            except ClaimExtractionError as e:
                # Log error but continue processing other texts
                print(f"⚠️ Failed to extract claim from text: {str(e)}")
                # Add a low-confidence result for failed extractions
                results.append(ExtractedClaim(
                    text=text if isinstance(text, str) else "",
                    entities={},
                    confidence=0.0
                ))
        
        return results
