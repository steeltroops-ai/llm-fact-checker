#!/usr/bin/env python3
"""
Fact base validation script.

Usage:
    python scripts/validate_fact_base.py <path_to_fact_base.json>

This script validates a fact base JSON file against the schema and reports
any errors or warnings.
"""

import sys
import json
from pathlib import Path
from typing import Dict, Any, List

# Add parent directory to path to import schemas
sys.path.insert(0, str(Path(__file__).parent.parent))

from schemas.fact_schema import FactSchema, validate_fact_base
from pydantic import ValidationError


def load_json_file(file_path: Path) -> Dict[str, Any]:
    """Load and parse JSON file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ Error: File not found: {file_path}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON in {file_path}")
        print(f"   {str(e)}")
        sys.exit(1)


def validate_file(file_path: Path) -> bool:
    """
    Validate a fact base file.
    
    Returns:
        True if validation passes, False otherwise
    """
    print(f"🔍 Validating fact base: {file_path}")
    print()
    
    # Load JSON data
    data = load_json_file(file_path)
    
    # Validate against schema
    try:
        fact_base = validate_fact_base(data)
        
        # Print summary
        print("✅ Validation passed!")
        print()
        print(f"📊 Summary:")
        print(f"   Version: {fact_base.version}")
        print(f"   Last Updated: {fact_base.last_updated or 'Not specified'}")
        print(f"   Total Facts: {len(fact_base.facts)}")
        print()
        
        # Category breakdown
        categories = {}
        for fact in fact_base.facts:
            categories[fact.category] = categories.get(fact.category, 0) + 1
        
        print(f"📁 Facts by Category:")
        for category, count in sorted(categories.items()):
            print(f"   {category}: {count}")
        print()
        
        # Check for warnings
        warnings = []
        
        # Check if we have enough facts
        if len(fact_base.facts) < 30:
            warnings.append(f"Fact base has only {len(fact_base.facts)} facts (recommended: 30-50)")
        
        # Check category distribution
        for category in ['agriculture', 'health', 'economy', 'infrastructure', 'education']:
            if category not in categories:
                warnings.append(f"No facts in category: {category}")
        
        # Check embedding dimensions
        for fact in fact_base.facts:
            if len(fact.embedding) != 384:
                warnings.append(f"Fact {fact.id} has incorrect embedding dimension: {len(fact.embedding)}")
        
        if warnings:
            print("⚠️  Warnings:")
            for warning in warnings:
                print(f"   - {warning}")
            print()
        
        return True
        
    except ValidationError as e:
        print("❌ Validation failed!")
        print()
        print("Errors:")
        for error in e.errors():
            location = " -> ".join(str(loc) for loc in error['loc'])
            print(f"   {location}: {error['msg']}")
        print()
        return False


def main():
    """Main entry point."""
    if len(sys.argv) != 2:
        print("Usage: python scripts/validate_fact_base.py <path_to_fact_base.json>")
        print()
        print("Example:")
        print("  python scripts/validate_fact_base.py data/fact_base.json")
        sys.exit(1)
    
    file_path = Path(sys.argv[1])
    success = validate_file(file_path)
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
