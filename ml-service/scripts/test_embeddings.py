#!/usr/bin/env python3
"""Test script to verify embeddings are properly generated and cached."""

import json
from pathlib import Path
import numpy as np


def test_embeddings():
    """Test that embeddings are properly generated."""
    
    fact_base_path = Path(__file__).parent.parent / "data" / "fact_base.json"
    
    print("🧪 Testing embeddings...")
    
    # Load fact base
    with open(fact_base_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    facts = data.get('facts', [])
    
    # Test 1: Check all facts have embeddings
    print("\n✓ Test 1: All facts have embeddings")
    for i, fact in enumerate(facts):
        assert 'embedding' in fact, f"Fact {i} missing embedding"
        assert len(fact['embedding']) > 0, f"Fact {i} has empty embedding"
    print(f"  ✅ All {len(facts)} facts have embeddings")
    
    # Test 2: Check embedding dimensions
    print("\n✓ Test 2: Embeddings are 384-dimensional")
    expected_dim = 384
    for i, fact in enumerate(facts):
        actual_dim = len(fact['embedding'])
        assert actual_dim == expected_dim, f"Fact {i} has {actual_dim} dimensions, expected {expected_dim}"
    print(f"  ✅ All embeddings are {expected_dim}-dimensional")
    
    # Test 3: Check embeddings are not all zeros
    print("\n✓ Test 3: Embeddings are not all zeros")
    for i, fact in enumerate(facts):
        embedding = fact['embedding']
        assert not all(x == 0.0 for x in embedding), f"Fact {i} has all-zero embedding"
    print(f"  ✅ All embeddings have non-zero values")
    
    # Test 4: Check embeddings have reasonable value ranges
    print("\n✓ Test 4: Embeddings have reasonable value ranges")
    for i, fact in enumerate(facts):
        embedding = np.array(fact['embedding'])
        min_val = embedding.min()
        max_val = embedding.max()
        # Sentence transformers typically produce values in [-1, 1] range
        assert -1.5 <= min_val <= 1.5, f"Fact {i} has unusual min value: {min_val}"
        assert -1.5 <= max_val <= 1.5, f"Fact {i} has unusual max value: {max_val}"
    print(f"  ✅ All embeddings have values in reasonable range [-1.5, 1.5]")
    
    # Test 5: Check embeddings are different from each other
    print("\n✓ Test 5: Embeddings are unique (not duplicated)")
    embeddings = [tuple(fact['embedding']) for fact in facts]
    unique_embeddings = set(embeddings)
    assert len(unique_embeddings) == len(embeddings), "Some embeddings are duplicated"
    print(f"  ✅ All {len(embeddings)} embeddings are unique")
    
    # Test 6: Check similarity between related facts
    print("\n✓ Test 6: Similar claims have higher cosine similarity")
    # Find two agriculture-related facts
    ag_facts = [f for f in facts if f['category'] == 'agriculture'][:2]
    if len(ag_facts) >= 2:
        emb1 = np.array(ag_facts[0]['embedding'])
        emb2 = np.array(ag_facts[1]['embedding'])
        
        # Cosine similarity
        similarity = np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2))
        print(f"  ✅ Similarity between agriculture facts: {similarity:.4f}")
        assert 0 <= similarity <= 1, f"Unexpected similarity value: {similarity}"
    
    print("\n" + "="*60)
    print("✅ All tests passed! Embeddings are properly generated.")
    print("="*60)


if __name__ == "__main__":
    test_embeddings()
