#!/usr/bin/env python3
"""Display sample embeddings from the fact base."""

import json
from pathlib import Path
import numpy as np


def show_sample_embeddings():
    """Display sample facts and their embedding statistics."""
    
    fact_base_path = Path(__file__).parent.parent / "data" / "fact_base.json"
    
    with open(fact_base_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    facts = data.get('facts', [])
    
    print("="*80)
    print("Sample Facts and Their Embeddings")
    print("="*80)
    
    # Show first 3 facts
    for i, fact in enumerate(facts[:3], 1):
        embedding = np.array(fact['embedding'])
        
        print(f"\n{i}. ID: {fact['id']}")
        print(f"   Category: {fact['category']}")
        print(f"   Claim: {fact['claim'][:70]}...")
        print(f"   Embedding Stats:")
        print(f"     - Dimensions: {len(fact['embedding'])}")
        print(f"     - Min value: {embedding.min():.6f}")
        print(f"     - Max value: {embedding.max():.6f}")
        print(f"     - Mean: {embedding.mean():.6f}")
        print(f"     - Std dev: {embedding.std():.6f}")
        print(f"     - First 5 values: {embedding[:5].tolist()}")
    
    print("\n" + "="*80)
    print(f"Total facts in database: {len(facts)}")
    print(f"Last updated: {data.get('last_updated', 'N/A')}")
    print("="*80)


if __name__ == "__main__":
    show_sample_embeddings()
