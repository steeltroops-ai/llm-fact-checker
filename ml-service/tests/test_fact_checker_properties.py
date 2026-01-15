"""
Property-based tests for FactChecker
Feature: fact-checker-pipeline, Property 2: Response structure completeness
Validates: Requirements 2.2, 2.3, 2.4, 2.5
"""
import pytest
from hypothesis import given, strategies as st, settings
from unittest.mock import patch, MagicMock
import os
from services.fact_checker import FactChecker


# Strategy for generating valid claims (1-1000 characters)
valid_claims = st.text(min_size=1, max_size=1000).filter(lambda x: x.strip())


@settings(max_examples=100)
@given(claim=valid_claims)
@patch.dict(os.environ, {
    'LLM_PROVIDER': 'gemini',
    'GEMINI_API_KEY': 'test_key_for_property_testing'
})
@patch('services.llm_client.genai')
@patch('services.fact_checker.SentenceTransformer')
def test_response_structure_completeness(mock_transformer, mock_genai, claim):
    """
    Property 2: Response structure completeness
    
    For any verification result, the response must contain all required fields
    (claim, verdict, confidence, explanation, sources) where verdict is one of
    "true", "false", or "uncertain", and confidence is between 0.0 and 1.0.
    
    Validates: Requirements 2.2, 2.3, 2.4, 2.5
    """
    # Arrange - Mock the LLM to return a valid JSON response
    mock_response = MagicMock()
    mock_response.text = '''```json
{
    "verdict": "true",
    "confidence": 0.85,
    "explanation": "This is a test explanation for the claim.",
    "sources": ["Test Source 1", "Test Source 2"]
}
```'''
    
    mock_model = MagicMock()
    mock_model.generate_content.return_value = mock_response
    mock_genai.GenerativeModel.return_value = mock_model
    
    mock_embedding_model = MagicMock()
    mock_transformer.return_value = mock_embedding_model
    
    # Act
    fact_checker = FactChecker()
    result = fact_checker.verify_claim(claim)
    
    # Assert - Check all required fields exist
    assert 'verdict' in result, "Response must contain 'verdict' field"
    assert 'confidence' in result, "Response must contain 'confidence' field"
    assert 'explanation' in result, "Response must contain 'explanation' field"
    assert 'sources' in result, "Response must contain 'sources' field"
    
    # Assert - Validate verdict is one of the allowed values
    assert result['verdict'] in ['true', 'false', 'uncertain'], \
        f"Verdict must be 'true', 'false', or 'uncertain', got: {result['verdict']}"
    
    # Assert - Validate confidence is between 0.0 and 1.0
    assert isinstance(result['confidence'], (int, float)), \
        f"Confidence must be a number, got: {type(result['confidence'])}"
    assert 0.0 <= result['confidence'] <= 1.0, \
        f"Confidence must be between 0.0 and 1.0, got: {result['confidence']}"
    
    # Assert - Validate explanation is a non-empty string
    assert isinstance(result['explanation'], str), \
        f"Explanation must be a string, got: {type(result['explanation'])}"
    assert len(result['explanation']) > 0, \
        "Explanation must not be empty"
    
    # Assert - Validate sources is a list
    assert isinstance(result['sources'], list), \
        f"Sources must be a list, got: {type(result['sources'])}"


@settings(max_examples=100)
@given(claim=valid_claims)
@patch.dict(os.environ, {
    'LLM_PROVIDER': 'gemini',
    'GEMINI_API_KEY': 'test_key_for_property_testing'
})
@patch('services.llm_client.genai')
@patch('services.fact_checker.SentenceTransformer')
def test_response_structure_with_malformed_json(mock_transformer, mock_genai, claim):
    """
    Property 2 (Fallback case): Response structure completeness with JSON parse failure
    
    Even when LLM returns malformed JSON, the system must still return a valid
    response structure with all required fields.
    
    Validates: Requirements 4.4 (JSON parsing fallback)
    """
    # Arrange - Mock the LLM to return malformed JSON
    mock_response = MagicMock()
    mock_response.text = "This is not valid JSON but still a response"
    
    mock_model = MagicMock()
    mock_model.generate_content.return_value = mock_response
    mock_genai.GenerativeModel.return_value = mock_model
    
    mock_embedding_model = MagicMock()
    mock_transformer.return_value = mock_embedding_model
    
    # Act
    fact_checker = FactChecker()
    result = fact_checker.verify_claim(claim)
    
    # Assert - Even with malformed JSON, all required fields must exist
    assert 'verdict' in result, "Fallback response must contain 'verdict' field"
    assert 'confidence' in result, "Fallback response must contain 'confidence' field"
    assert 'explanation' in result, "Fallback response must contain 'explanation' field"
    assert 'sources' in result, "Fallback response must contain 'sources' field"
    
    # Assert - Fallback should return "uncertain" verdict
    assert result['verdict'] == 'uncertain', \
        f"Fallback verdict should be 'uncertain', got: {result['verdict']}"
    
    # Assert - Fallback confidence should be 0.5
    assert result['confidence'] == 0.5, \
        f"Fallback confidence should be 0.5, got: {result['confidence']}"
    
    # Assert - Explanation should contain the raw response
    assert isinstance(result['explanation'], str), \
        "Fallback explanation must be a string"
    assert len(result['explanation']) > 0, \
        "Fallback explanation must not be empty"
    
    # Assert - Sources should be an empty list
    assert result['sources'] == [], \
        f"Fallback sources should be empty list, got: {result['sources']}"


@settings(max_examples=100)
@given(
    verdict=st.sampled_from(['true', 'false', 'uncertain']),
    confidence=st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False)
)
@patch.dict(os.environ, {
    'LLM_PROVIDER': 'gemini',
    'GEMINI_API_KEY': 'test_key_for_property_testing'
})
@patch('services.llm_client.genai')
@patch('services.fact_checker.SentenceTransformer')
def test_response_structure_with_various_verdicts_and_confidence(
    mock_transformer, mock_genai, verdict, confidence
):
    """
    Property 2 (Extended): Response structure with various verdict and confidence values
    
    For any valid verdict and confidence combination, the response structure
    must remain consistent and valid.
    
    Validates: Requirements 2.2, 2.3
    """
    # Arrange - Mock the LLM to return various verdict/confidence combinations
    mock_response = MagicMock()
    mock_response.text = f'''{{
        "verdict": "{verdict}",
        "confidence": {confidence},
        "explanation": "Test explanation",
        "sources": ["Source 1"]
    }}'''
    
    mock_model = MagicMock()
    mock_model.generate_content.return_value = mock_response
    mock_genai.GenerativeModel.return_value = mock_model
    
    mock_embedding_model = MagicMock()
    mock_transformer.return_value = mock_embedding_model
    
    # Act
    fact_checker = FactChecker()
    result = fact_checker.verify_claim("Test claim")
    
    # Assert - Verify the verdict matches what was provided
    assert result['verdict'] == verdict, \
        f"Expected verdict '{verdict}', got '{result['verdict']}'"
    
    # Assert - Verify confidence is within valid range
    assert 0.0 <= result['confidence'] <= 1.0, \
        f"Confidence must be between 0.0 and 1.0, got: {result['confidence']}"
    
    # Assert - Verify confidence is close to what was provided (allowing for float precision)
    assert abs(result['confidence'] - confidence) < 0.01, \
        f"Expected confidence ~{confidence}, got {result['confidence']}"
