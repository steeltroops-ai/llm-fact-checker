# Fact Base Schema Documentation

## Overview

The fact base schema defines the structure for storing verified factual statements with their embeddings for the RAG (Retrieval-Augmented Generation) fact verification system.

## Schema Files

- **`fact_base_schema.json`**: JSON Schema definition (JSON Schema Draft 07)
- **`fact_schema.py`**: Pydantic models and validation utilities
- **`__init__.py`**: Package exports

## Schema Structure

### Top Level

```json
{
  "version": "1.0.0",
  "last_updated": "2024-01-15T10:30:00Z",
  "facts": [...]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | Yes | Schema version (semantic versioning: X.Y.Z) |
| `last_updated` | string | No | ISO 8601 timestamp of last update |
| `facts` | array | Yes | Array of fact objects (minimum 1) |

### Fact Object

```json
{
  "id": "fact_001",
  "statement": "Water boils at 100 degrees Celsius at sea level",
  "category": "science",
  "source": "https://www.nist.gov/...",
  "date_verified": "2024-01-15",
  "embedding": [0.123, -0.456, ...],
  "metadata": {...}
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique identifier (format: `fact_XXX` where XXX is 3+ digits) |
| `statement` | string | Yes | Verified factual statement (10-500 characters) |
| `category` | string | Yes | One of: `science`, `geography`, `history`, `health`, `technology` |
| `source` | string | Yes | Authoritative source URL or reference |
| `date_verified` | string | Yes | Date of verification (ISO 8601: YYYY-MM-DD) |
| `embedding` | array | Yes | 384-dimensional float array from all-MiniLM-L6-v2 |
| `metadata` | object | No | Optional additional metadata |

### Metadata Object (Optional)

```json
{
  "confidence": 0.95,
  "tags": ["physics", "thermodynamics"],
  "related_facts": ["fact_002", "fact_003"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `confidence` | number | Confidence in fact accuracy (0.0-1.0) |
| `tags` | array | Additional classification tags |
| `related_facts` | array | IDs of related facts |

## Categories

The schema supports five fact categories:

1. **science**: Physics, chemistry, biology, astronomy
2. **geography**: Countries, capitals, landmarks, physical geography
3. **history**: Historical events, dates, figures
4. **health**: Medical facts, nutrition, anatomy
5. **technology**: Computing, engineering, innovations

## Embedding Requirements

- **Model**: all-MiniLM-L6-v2 (sentence-transformers)
- **Dimensions**: Exactly 384
- **Type**: Array of floats
- **Range**: Typically between -1.0 and 1.0

## Validation

### Using Python

```python
from schemas import validate_fact_base, FactSchema

# Load and validate a fact base file
import json

with open('data/fact_base.json', 'r') as f:
    data = json.load(f)

fact_base = validate_fact_base(data)
print(f"Loaded {len(fact_base.facts)} facts")
```

### Using Validation Script

```bash
python scripts/validate_fact_base.py data/fact_base.json
```

The script will:
- ✅ Validate JSON structure
- ✅ Check required fields
- ✅ Verify data types and formats
- ✅ Ensure unique fact IDs
- ✅ Validate embedding dimensions
- ⚠️  Warn about missing categories
- ⚠️  Warn if fact count < 30

## Example Fact Base

See `data/fact_base_example.json` for a complete example with 3 facts.

**Note**: The example has empty embeddings (`[]`) for brevity. In production, each fact must have a complete 384-dimensional embedding vector.

## Creating a New Fact

```python
from schemas.fact_schema import Fact
from sentence_transformers import SentenceTransformer

# Initialize embedding model
model = SentenceTransformer('all-MiniLM-L6-v2')

# Create fact
fact = Fact(
    id="fact_042",
    statement="The Earth orbits the Sun once every 365.25 days",
    category="science",
    source="https://www.nasa.gov/...",
    date_verified="2024-01-15",
    embedding=model.encode("The Earth orbits the Sun once every 365.25 days").tolist(),
    metadata={
        "confidence": 1.0,
        "tags": ["astronomy", "solar system"]
    }
)
```

## Schema Versioning

The schema follows semantic versioning (MAJOR.MINOR.PATCH):

- **MAJOR**: Breaking changes (incompatible with previous versions)
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

Current version: **1.0.0**

## Best Practices

1. **Unique IDs**: Always use sequential IDs (fact_001, fact_002, ...)
2. **Clear Statements**: Write concise, unambiguous factual statements
3. **Authoritative Sources**: Use government, academic, or reputable sources
4. **Recent Verification**: Update `date_verified` when facts are re-verified
5. **Complete Embeddings**: Never leave embeddings empty in production
6. **Balanced Categories**: Aim for 6-10 facts per category
7. **Metadata Tags**: Use consistent, lowercase tags for better organization

## Troubleshooting

### Common Validation Errors

**Error**: `id: string does not match regex "^fact_[0-9]{3,}$"`
- **Fix**: Use format `fact_001`, `fact_042`, etc. (minimum 3 digits)

**Error**: `embedding: ensure this value has at least 384 items`
- **Fix**: Generate embedding using all-MiniLM-L6-v2 model

**Error**: `category: Category must be one of [...]`
- **Fix**: Use only: science, geography, history, health, technology

**Error**: `date_verified: date_verified must be in YYYY-MM-DD format`
- **Fix**: Use ISO 8601 date format (e.g., "2024-01-15")

**Error**: `Duplicate fact IDs found`
- **Fix**: Ensure all fact IDs are unique across the fact base

## Related Files

- `ml-service/services/fact_base_manager.py`: Fact base management class
- `ml-service/data/fact_base.json`: Production fact base
- `ml-service/scripts/validate_fact_base.py`: Validation script
