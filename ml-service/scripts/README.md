# ML Service Scripts

This directory contains utility scripts for managing the fact base and embeddings.

## Scripts Overview

### 1. add_example_embeddings.py

**Purpose:** Generate embeddings for the fact base using sentence-transformers.

**Usage:**
```bash
# Generate embeddings for default fact base
python scripts/add_example_embeddings.py

# Specify custom fact base path
python scripts/add_example_embeddings.py --fact-base path/to/fact_base.json

# Use different embedding model
python scripts/add_example_embeddings.py --model all-mpnet-base-v2
```

**Features:**
- Automatically detects facts without embeddings
- Only regenerates missing embeddings (caching)
- Uses all-MiniLM-L6-v2 model (384 dimensions) by default
- Shows progress bar during generation
- Updates `last_updated` timestamp
- Validates embedding dimensions

**Output:**
```
📚 Loading fact base from ml-service/data/fact_base.json
✅ Loaded 40 facts
🔄 Generating embeddings for 40 facts...
📦 Loading model: all-MiniLM-L6-v2
✅ Model loaded successfully
🔄 Generating embeddings (this may take a moment)...
Batches: 100%|████████████████████| 2/2 [00:00<00:00,  4.29it/s]
✅ Embeddings are 384-dimensional (as expected)
💾 Saving updated fact base
✅ Successfully generated embeddings for 40 facts
```

**Performance:**
- ~5 seconds for 40 facts
- ~0.1 seconds per fact on average

---

### 2. validate_fact_base.py

**Purpose:** Validate fact base schema and data integrity.

**Usage:**
```bash
python scripts/validate_fact_base.py data/fact_base.json
```

**Checks:**
- JSON schema validation
- Required fields present
- Embedding dimensions (384)
- Duplicate IDs
- Valid categories
- Date formats
- URL formats

---

### 3. test_embeddings.py

**Purpose:** Verify embeddings are properly generated and valid.

**Usage:**
```bash
python scripts/test_embeddings.py
```

**Tests:**
1. All facts have embeddings
2. Embeddings are 384-dimensional
3. Embeddings are not all zeros
4. Values are in reasonable range [-1.5, 1.5]
5. Embeddings are unique (not duplicated)
6. Similar claims have higher cosine similarity

**Output:**
```
🧪 Testing embeddings...

✓ Test 1: All facts have embeddings
  ✅ All 40 facts have embeddings

✓ Test 2: Embeddings are 384-dimensional
  ✅ All embeddings are 384-dimensional

...

============================================================
✅ All tests passed! Embeddings are properly generated.
============================================================
```

---

### 4. show_sample_embeddings.py

**Purpose:** Display sample facts and their embedding statistics.

**Usage:**
```bash
python scripts/show_sample_embeddings.py
```

**Output:**
```
================================================================================
Sample Facts and Their Embeddings
================================================================================

1. ID: pib-2024-001
   Category: agriculture
   Claim: Government announces PM-KISAN scheme providing Rs 6000 annual income s...
   Embedding Stats:
     - Dimensions: 384
     - Min value: -0.171976
     - Max value: 0.141037
     - Mean: -0.000377
     - Std dev: 0.051030
     - First 5 values: [-0.076, 0.016, -0.075, -0.031, 0.074]
```

---

## Workflow

### Initial Setup

1. **Populate fact base** (if not already done):
   ```bash
   # Fact base should exist at ml-service/data/fact_base.json
   ```

2. **Validate fact base**:
   ```bash
   python scripts/validate_fact_base.py data/fact_base.json
   ```

3. **Generate embeddings**:
   ```bash
   python scripts/add_example_embeddings.py
   ```

4. **Test embeddings**:
   ```bash
   python scripts/test_embeddings.py
   ```

### Adding New Facts

1. Edit `ml-service/data/fact_base.json`
2. Add new facts with `embedding: [0.0] * 384` (placeholder)
3. Run validation: `python scripts/validate_fact_base.py data/fact_base.json`
4. Generate embeddings: `python scripts/add_example_embeddings.py`
5. Test: `python scripts/test_embeddings.py`

### Regenerating All Embeddings

If you need to regenerate all embeddings (e.g., using a different model):

1. Set all embeddings to zeros in the JSON file, or
2. Delete the `embedding` field from all facts
3. Run: `python scripts/add_example_embeddings.py --model your-model-name`

---

## Technical Details

### Embedding Model

**Default:** `all-MiniLM-L6-v2`
- **Dimensions:** 384
- **Performance:** Fast inference (~0.1s per fact)
- **Quality:** Good for semantic similarity
- **Size:** ~80MB download

**Alternative Models:**
- `all-mpnet-base-v2` (768 dims, higher quality, slower)
- `paraphrase-MiniLM-L6-v2` (384 dims, optimized for paraphrases)
- `multi-qa-MiniLM-L6-cos-v1` (384 dims, optimized for Q&A)

### Caching Behavior

The script implements smart caching:
- Checks if embeddings already exist (non-zero values)
- Only generates embeddings for facts without them
- Saves embeddings back to the JSON file
- Subsequent runs skip already-embedded facts

### Error Handling

The script handles common errors:
- Missing fact base file → Exit with error message
- Empty fact base → Exit with error message
- Model loading failure → Exit with error message
- Embedding generation failure → Exit with error message
- File write failure → Exit with error message

All errors include descriptive messages with ❌ emoji for visibility.

---

## Dependencies

Required packages (from `requirements.txt`):
- `sentence-transformers>=3.3.0`
- `numpy>=1.24.0`

The sentence-transformers library will automatically download the model on first use.

---

## Troubleshooting

**Issue:** "sentence-transformers not installed"
```bash
pip install sentence-transformers
```

**Issue:** Model download fails
- Check internet connection
- Try manually downloading: `python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"`

**Issue:** Out of memory during embedding generation
- Use a smaller model
- Process facts in smaller batches
- Increase system RAM

**Issue:** Embeddings are all zeros after running script
- Check script output for errors
- Verify write permissions on fact_base.json
- Run test script: `python scripts/test_embeddings.py`

---

## Related Files

- `ml-service/data/fact_base.json` - Main fact base with embeddings
- `ml-service/schemas/fact_schema.py` - Pydantic models for validation
- `ml-service/services/fact_base_manager.py` - Fact base management class (to be implemented)
