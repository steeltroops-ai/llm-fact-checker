"""
Fact base schema validation and data models.

This module provides Pydantic models and validation functions for the fact base
JSON schema used in the RAG fact verification system.
"""

import json
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import date, datetime
from pydantic import BaseModel, Field, field_validator, HttpUrl


class FactMetadata(BaseModel):
    """Optional metadata for a fact."""
    confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="Confidence in fact accuracy")
    tags: Optional[List[str]] = Field(None, description="Additional classification tags")
    related_facts: Optional[List[str]] = Field(None, description="IDs of related facts")


class Fact(BaseModel):
    """
    A verified factual statement from PIB with embedding.
    
    Attributes:
        id: Unique identifier (format: pib-YYYY-XXX)
        claim: The verified factual claim from PIB
        category: Domain category (agriculture, health, economy, infrastructure, education)
        source: PIB source URL or reference
        publication_date: Date when the fact was published (YYYY-MM-DD)
        embedding: 384-dimensional vector from all-MiniLM-L6-v2
        metadata: Optional additional metadata
    """
    id: str = Field(..., pattern=r"^(fact_[0-9]{3,}|pib-\d{4}-\d{3})$", description="Unique fact identifier")
    claim: str = Field(..., min_length=10, max_length=500, description="Verified factual claim")
    category: str = Field(..., description="Domain category")
    source: str = Field(..., description="PIB source URL or reference")
    publication_date: str = Field(..., description="Date when fact was published (YYYY-MM-DD)")
    embedding: List[float] = Field(..., min_length=384, max_length=384, description="384-dim embedding vector")
    metadata: Optional[FactMetadata] = Field(None, description="Optional metadata")
    
    @field_validator('category')
    @classmethod
    def validate_category(cls, v):
        """Validate category is one of the allowed values."""
        allowed = ['agriculture', 'health', 'economy', 'infrastructure', 'education']
        if v not in allowed:
            raise ValueError(f"Category must be one of {allowed}, got '{v}'")
        return v
    
    @field_validator('publication_date')
    @classmethod
    def validate_date_format(cls, v):
        """Validate date is in ISO 8601 format (YYYY-MM-DD)."""
        try:
            datetime.strptime(v, '%Y-%m-%d')
        except ValueError:
            raise ValueError(f"publication_date must be in YYYY-MM-DD format, got '{v}'")
        return v
    
    @field_validator('embedding')
    @classmethod
    def validate_embedding_values(cls, v):
        """Validate embedding contains valid float values."""
        if not all(isinstance(x, (int, float)) for x in v):
            raise ValueError("All embedding values must be numbers")
        return v


class FactBase(BaseModel):
    """
    Complete fact base with version and metadata.
    
    Attributes:
        version: Schema version (semantic versioning)
        last_updated: ISO 8601 timestamp of last update
        facts: Collection of verified facts
    """
    version: str = Field(..., pattern=r"^\d+\.\d+\.\d+$", description="Schema version")
    last_updated: Optional[str] = Field(None, description="ISO 8601 timestamp of last update")
    facts: List[Fact] = Field(..., min_length=1, description="Collection of verified facts")
    
    @field_validator('facts')
    @classmethod
    def validate_unique_ids(cls, v):
        """Ensure all fact IDs are unique."""
        ids = [fact.id for fact in v]
        if len(ids) != len(set(ids)):
            duplicates = [id for id in ids if ids.count(id) > 1]
            raise ValueError(f"Duplicate fact IDs found: {set(duplicates)}")
        return v


class FactSchema:
    """
    Utility class for working with the fact base schema.
    
    Provides methods for loading, validating, and working with fact base data.
    """
    
    SCHEMA_VERSION = "1.0.0"
    SCHEMA_PATH = Path(__file__).parent / "fact_base_schema.json"
    
    @classmethod
    def load_schema(cls) -> Dict[str, Any]:
        """
        Load the JSON schema definition.
        
        Returns:
            Dictionary containing the JSON schema
            
        Raises:
            FileNotFoundError: If schema file doesn't exist
            json.JSONDecodeError: If schema file is invalid JSON
        """
        if not cls.SCHEMA_PATH.exists():
            raise FileNotFoundError(f"Schema file not found: {cls.SCHEMA_PATH}")
        
        with open(cls.SCHEMA_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    @classmethod
    def validate_fact_base(cls, data: Dict[str, Any]) -> FactBase:
        """
        Validate fact base data against the schema.
        
        Args:
            data: Dictionary containing fact base data
            
        Returns:
            Validated FactBase object
            
        Raises:
            ValidationError: If data doesn't match schema
        """
        return FactBase(**data)
    
    @classmethod
    def create_empty_fact_base(cls) -> FactBase:
        """
        Create an empty fact base with current version.
        
        Returns:
            Empty FactBase object with version and timestamp
        """
        return FactBase(
            version=cls.SCHEMA_VERSION,
            last_updated=datetime.utcnow().isoformat() + 'Z',
            facts=[]
        )
    
    @classmethod
    def validate_fact(cls, fact_data: Dict[str, Any]) -> Fact:
        """
        Validate a single fact against the schema.
        
        Args:
            fact_data: Dictionary containing fact data
            
        Returns:
            Validated Fact object
            
        Raises:
            ValidationError: If fact doesn't match schema
        """
        return Fact(**fact_data)


def load_schema() -> Dict[str, Any]:
    """
    Load the fact base JSON schema.
    
    Returns:
        Dictionary containing the JSON schema
    """
    return FactSchema.load_schema()


def validate_fact_base(data: Dict[str, Any]) -> FactBase:
    """
    Validate fact base data against the schema.
    
    Args:
        data: Dictionary containing fact base data
        
    Returns:
        Validated FactBase object
        
    Raises:
        ValidationError: If data doesn't match schema
    """
    return FactSchema.validate_fact_base(data)
