"""
Property-based tests for JSON serialization
Feature: fact-checker-pipeline, Property 4: JSON serialization consistency
Validates: Requirements 4.3
"""
import pytest
import json
from hypothesis import given, strategies as st, settings
from unittest.mock import patch, MagicMock
import os
from services.fact_checker import FactChecker
from pydantic import ValidationError


# Strategy for generating valid claims
valid_claims = st.text(min_size=1, max_size=1000).filter(lambda x: x.strip())

# Strategy for generating valid verdict values
valid_verdicts = st.sampled_from(['true', 'false', 'uncertain'])

# Strategy for generating valid confidence scores
valid_confidence = st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False)

# Strategy for generating explanations
valid_explanations = st.text(min_size=1, max_size=5000)

# Strategy for generating source lists
valid_sources = st.lists(st.text(min_size=1, max_size=200), min_size=0, max_size=10)


@settings(max_examples=100)
@given(
    claim=valid_claims,
    verdict=valid_verdicts,
    confidence=valid_confidence,
    explanation=valid_explanations,
    sources=valid_sources
)
@patch.dict(os.environ, {
    'LLM_PROVIDER': 'gemini',
    'GEMINI_API_KEY': 'test_key_for_property_testing'
})
@patch('services.llm_client.genai')
@patch('services.fact_checker.SentenceTransformer')
def test_json_serialization_consistency(
    mock_transformer, mock_genai, claim, verdict, confidence, explanation, sources
):
    """
    Property 4: JSON serialization consistency
    
    For any ML service response, the output must be valid JSON that can be
    parsed into the VerificationResponse schema without errors.
    
    This property ensures that:
    1. The response from FactChecker can be serialized to JSON
    2. The JSON can be deserialized back to a dict
    3. The deserialized dict matches the original structure
    4. All required fields are present and valid
    
    Validates: Requirements 4.3
    """
    # Arrange - Mock the LLM to return a response with the generated values
    mock_response = MagicMock()
    sources_json = json.dumps(sources)
    mock_response.text = f'''{{
        "verdict": "{verdict}",
        "confidence": {confidence},
        "explanation": {json.dumps(explanation)},
        "sources": {sources_json}
    }}'''
    
    mock_model = MagicMock()
    mock_model.generate_content.return_value = mock_response
    mock_genai.GenerativeModel.return_value = mock_model
    
    mock_embedding_model = MagicMock()
    mock_transformer.return_value = mock_embedding_model
    
    # Act - Get the result from FactChecker
    fact_checker = FactChecker()
    result = fact_checker.verify_claim(claim)
    
    # Assert 1: Result must be serializable to JSON
    try:
        json_string = json.dumps(result)
    except (TypeError, ValueError) as e:
        pytest.fail(f"Result is not JSON serializable: {e}")
    
    # Assert 2: JSON string must be valid and parseable
    try:
        deserialized = json.loads(json_string)
    except json.JSONDecodeError as e:
        pytest.fail(f"Generated JSON is not valid: {e}")
    
    # Assert 3: Deserialized data must match original structure
    assert isinstance(deserialized, dict), \
        f"Deserialized result must be a dict, got: {type(deserialized)}"
    
    # Assert 4: All required fields must be present
    required_fields = ['verdict', 'confidence', 'explanation', 'sources']
    for field in required_fields:
        assert field in deserialized, \
            f"Required field '{field}' missing from deserialized JSON"
    
    # Assert 5: Field types must be correct after deserialization
    assert isinstance(deserialized['verdict'], str), \
        f"Verdict must be string after deserialization, got: {type(deserialized['verdict'])}"
    
    assert isinstance(deserialized['confidence'], (int, float)), \
        f"Confidence must be number after deserialization, got: {type(deserialized['confidence'])}"
    
    assert isinstance(deserialized['explanation'], str), \
        f"Explanation must be string after deserialization, got: {type(deserialized['explanation'])}"
    
    assert isinstance(deserialized['sources'], list), \
        f"Sources must be list after deserialization, got: {type(deserialized['sources'])}"
    
    # Assert 6: Values must match (round-trip consistency)
    assert deserialized['verdict'] == result['verdict'], \
        "Verdict changed during JSON round-trip"
    
    assert abs(deserialized['confidence'] - result['confidence']) < 0.0001, \
        "Confidence changed during JSON round-trip"
    
    assert deserialized['explanation'] == result['explanation'], \
        "Explanation changed during JSON round-trip"
    
    assert deserialized['sources'] == result['sources'], \
        "Sources changed during JSON round-trip"


@settings(max_examples=100)
@given(claim=valid_claims)
@patch.dict(os.environ, {
    'LLM_PROVIDER': 'gemini',
    'GEMINI_API_KEY': 'test_key_for_property_testing'
})
@patch('services.llm_client.genai')
@patch('services.fact_checker.SentenceTransformer')
def test_json_serialization_with_special_characters(mock_transformer, mock_genai, claim):
    """
    Property 4 (Extended): JSON serialization with special characters
    
    For any response containing special characters (quotes, newlines, unicode),
    the JSON serialization must handle them correctly without corruption.
    
    Validates: Requirements 4.3
    """
    # Arrange - Mock response with special characters
    special_explanation = 'This contains "quotes", newlines\nand unicode: 🔬 °C'
    special_sources = ['Source with "quotes"', 'Source with\nnewline', 'Unicode: 🌍']
    
    mock_response = MagicMock()
    mock_response.text = f'''{{
        "verdict": "true",
        "confidence": 0.85,
        "explanation": {json.dumps(special_explanation)},
        "sources": {json.dumps(special_sources)}
    }}'''
    
    mock_model = MagicMock()
    mock_model.generate_content.return_value = mock_response
    mock_genai.GenerativeModel.return_value = mock_model
    
    mock_embedding_model = MagicMock()
    mock_transformer.return_value = mock_embedding_model
    
    # Act
    fact_checker = FactChecker()
    result = fact_checker.verify_claim(claim)
    
    # Assert - Must be JSON serializable despite special characters
    try:
        json_string = json.dumps(result)
        deserialized = json.loads(json_string)
    except Exception as e:
        pytest.fail(f"Failed to serialize/deserialize with special characters: {e}")
    
    # Assert - Special characters must be preserved
    assert deserialized['explanation'] == special_explanation, \
        "Special characters in explanation were corrupted"
    
    assert deserialized['sources'] == special_sources, \
        "Special characters in sources were corrupted"


@settings(max_examples=100)
@given(claim=valid_claims)
@patch.dict(os.environ, {
    'LLM_PROVIDER': 'gemini',
    'GEMINI_API_KEY': 'test_key_for_property_testing'
})
@patch('services.llm_client.genai')
@patch('services.fact_checker.SentenceTransformer')
def test_json_serialization_with_empty_sources(mock_transformer, mock_genai, claim):
    """
    Property 4 (Edge case): JSON serialization with empty sources list
    
    For any response with an empty sources list, JSON serialization must
    still work correctly.
    
    Validates: Requirements 4.3
    """
    # Arrange - Mock response with empty sources
    mock_response = MagicMock()
    mock_response.text = '''{{
        "verdict": "uncertain",
        "confidence": 0.5,
        "explanation": "No sources available",
        "sources": []
    }}'''
    
    mock_model = MagicMock()
    mock_model.generate_content.return_value = mock_response
    mock_genai.GenerativeModel.return_value = mock_model
    
    mock_embedding_model = MagicMock()
    mock_transformer.return_value = mock_embedding_model
    
    # Act
    fact_checker = FactChecker()
    result = fact_checker.verify_claim(claim)
    
    # Assert - Empty list must serialize correctly
    try:
        json_string = json.dumps(result)
        deserialized = json.loads(json_string)
    except Exception as e:
        pytest.fail(f"Failed to serialize/deserialize with empty sources: {e}")
    
    assert deserialized['sources'] == [], \
        "Empty sources list was not preserved"
    
    assert isinstance(deserialized['sources'], list), \
        "Empty sources must remain a list type"


@settings(max_examples=100)
@given(
    confidence=st.floats(
        min_value=0.0,
        max_value=1.0,
        allow_nan=False,
        allow_infinity=False
    )
)
@patch.dict(os.environ, {
    'LLM_PROVIDER': 'gemini',
    'GEMINI_API_KEY': 'test_key_for_property_testing'
})
@patch('services.llm_client.genai')
@patch('services.fact_checker.SentenceTransformer')
def test_json_serialization_float_precision(mock_transformer, mock_genai, confidence):
    """
    Property 4 (Extended): JSON serialization preserves float precision
    
    For any confidence score (float between 0.0 and 1.0), JSON serialization
    must preserve the value with acceptable precision.
    
    Validates: Requirements 4.3
    """
    # Arrange - Mock response with specific confidence value
    mock_response = MagicMock()
    mock_response.text = f'''{{
        "verdict": "true",
        "confidence": {confidence},
        "explanation": "Test",
        "sources": []
    }}'''
    
    mock_model = MagicMock()
    mock_model.generate_content.return_value = mock_response
    mock_genai.GenerativeModel.return_value = mock_model
    
    mock_embedding_model = MagicMock()
    mock_transformer.return_value = mock_embedding_model
    
    # Act
    fact_checker = FactChecker()
    result = fact_checker.verify_claim("Test claim")
    
    # Assert - Serialize and deserialize
    json_string = json.dumps(result)
    deserialized = json.loads(json_string)
    
    # Assert - Float precision must be preserved (within reasonable tolerance)
    assert abs(deserialized['confidence'] - confidence) < 0.0001, \
        f"Float precision lost: expected {confidence}, got {deserialized['confidence']}"
    
    # Assert - Confidence must still be in valid range after round-trip
    assert 0.0 <= deserialized['confidence'] <= 1.0, \
        f"Confidence out of range after serialization: {deserialized['confidence']}"
