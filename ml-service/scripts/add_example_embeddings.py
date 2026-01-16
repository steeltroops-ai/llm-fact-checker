#!/usr/bin/env python3
"""Generate embeddings for fact base using sentence-transformers.

This script loads the fact base, generates embeddings for each claim using
the all-MiniLM-L6-v2 model, and saves the updated fact base with embeddings.
"""

import json
from pathlib import Path
from datetime import datetime
import sys

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    print("❌ Error: sentence-transformers not installed")
    print("Please install it with: pip install sentence-transformers")
    sys.exit(1)


def generate_embeddings(fact_base_path: str = None, model_name: str = "all-MiniLM-L6-v2"):
    """Generate embeddings for all facts in the fact base.
    
    Args:
        fact_base_path: Path to fact_base.json (default: ml-service/data/fact_base.json)
        model_name: Sentence transformer model to use (default: all-MiniLM-L6-v2)
    """
    # Determine fact base path
    if fact_base_path is None:
        fact_base_path = Path(__file__).parent.parent / "data" / "fact_base.json"
    else:
        fact_base_path = Path(fact_base_path)
    
    if not fact_base_path.exists():
        print(f"❌ Error: Fact base not found at {fact_base_path}")
        sys.exit(1)
    
    print(f"📚 Loading fact base from {fact_base_path}")
    
    # Load fact base
    with open(fact_base_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    facts = data.get('facts', [])
    total_facts = len(facts)
    
    if total_facts == 0:
        print("❌ Error: No facts found in fact base")
        sys.exit(1)
    
    print(f"✅ Loaded {total_facts} facts")
    
    # Check which facts need embeddings
    facts_without_embeddings = []
    for i, fact in enumerate(facts):
        embedding = fact.get('embedding', [])
        # Check if embedding is missing or all zeros
        if not embedding or all(x == 0.0 for x in embedding):
            facts_without_embeddings.append((i, fact))
    
    if not facts_without_embeddings:
        print("✅ All facts already have embeddings!")
        return
    
    print(f"🔄 Generating embeddings for {len(facts_without_embeddings)} facts...")
    print(f"📦 Loading model: {model_name}")
    
    # Load sentence transformer model
    try:
        model = SentenceTransformer(model_name)
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        sys.exit(1)
    
    print(f"✅ Model loaded successfully")
    
    # Extract claims for embedding generation
    claims = [fact['claim'] for _, fact in facts_without_embeddings]
    
    # Generate embeddings
    print(f"🔄 Generating embeddings (this may take a moment)...")
    try:
        embeddings = model.encode(claims, show_progress_bar=True, convert_to_numpy=True)
    except Exception as e:
        print(f"❌ Error generating embeddings: {e}")
        sys.exit(1)
    
    # Verify embedding dimensions
    expected_dim = 384  # all-MiniLM-L6-v2 produces 384-dimensional embeddings
    actual_dim = embeddings.shape[1]
    
    if actual_dim != expected_dim:
        print(f"⚠️  Warning: Expected {expected_dim}-dimensional embeddings, got {actual_dim}")
    else:
        print(f"✅ Embeddings are {actual_dim}-dimensional (as expected)")
    
    # Update facts with embeddings
    for (idx, fact), embedding in zip(facts_without_embeddings, embeddings):
        facts[idx]['embedding'] = embedding.tolist()
    
    # Update metadata
    data['last_updated'] = datetime.now(datetime.UTC).isoformat().replace('+00:00', 'Z')
    
    # Save updated fact base
    print(f"💾 Saving updated fact base to {fact_base_path}")
    try:
        with open(fact_base_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"❌ Error saving fact base: {e}")
        sys.exit(1)
    
    print(f"✅ Successfully generated embeddings for {len(facts_without_embeddings)} facts")
    print(f"📊 Summary:")
    print(f"   - Total facts: {total_facts}")
    print(f"   - Facts updated: {len(facts_without_embeddings)}")
    print(f"   - Embedding dimensions: {actual_dim}")
    print(f"   - Model used: {model_name}")
    print(f"   - Last updated: {data['last_updated']}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Generate embeddings for fact base using sentence-transformers"
    )
    parser.add_argument(
        "--fact-base",
        type=str,
        default=None,
        help="Path to fact_base.json (default: ml-service/data/fact_base.json)"
    )
    parser.add_argument(
        "--model",
        type=str,
        default="all-MiniLM-L6-v2",
        help="Sentence transformer model to use (default: all-MiniLM-L6-v2)"
    )
    
    args = parser.parse_args()
    
    generate_embeddings(fact_base_path=args.fact_base, model_name=args.model)
