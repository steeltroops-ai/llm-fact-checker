"""
Unit tests for FactChecker
Tests Requirements: 4.4, 4.5
"""
import pytest
import os
from unittest.mock import patch, MagicMock
from services.fact_checker import FactChecker


class TestFactCheckerInitialization:
    """Test FactChecker initialization"""
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'gemini',
        'GEMINI_API_KEY': 'test_key'
    })
    @patch('services.llm_client.genai')
    @patch('services.fact_checker.SentenceTransformer')
    def test_fact_checker_initialization(self, mock_transformer, mock_genai):
        """Test FactChecker initializes with LLM client and embedding model"""
        # Arrange
        mock_model = MagicMock()
        mock_genai.GenerativeModel.return_value = mock_model
        
        mock_embedding_model = MagicMock()
        mock_transformer.return_value = mock_embedding_model
        
        # Act
        fact_checker = FactChecker()
        
        # Assert
        assert fact_checker.llm is not None
        assert fact_checker.embedding_model is not None
        mock_transformer.assert_called_once_with('all-MiniLM-L6-v2')


class TestFactCheckerVerifyClaim:
    """Test claim verification functionality"""
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'gemini',
        'GEMINI_API_KEY': 'test_key'
    })
    @patch('services.llm_client.genai')
    @patch('services.fact_checker.SentenceTransformer')
    def test_verify_valid_claim(self, mock_transformer, mock_genai):
        """Test verification of a valid claim with proper JSON response"""
        # Arrange
        mock_response = MagicMock()
        mock_response.text = '''```json
{
    "verdict": "true",
    "confidence": 0.95,
    "explanation": "Water boils at 100°C at sea level under standard atmospheric pressure.",
    "sources": ["Physics textbooks", "Scientific consensus"]
}
```'''
        
        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model
        
        mock_embedding_model = MagicMock()
        mock_transformer.return_value = mock_embedding_model
        
        fact_checker = FactChecker()
        
        # Act
        result = fact_checker.verify_claim("Water boils at 100°C at sea level")
        
        # Assert
        assert result['verdict'] == 'true'
        assert result['confidence'] == 0.95
        assert 'Water boils' in result['explanation']
        assert len(result['sources']) == 2
        assert 'Physics textbooks' in result['sources']
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'gemini',
        'GEMINI_API_KEY': 'test_key'
    })
    @patch('services.llm_client.genai')
    @patch('services.fact_checker.SentenceTransformer')
    def test_verify_claim_without_markdown(self, mock_transformer, mock_genai):
        """Test verification when LLM returns JSON without markdown code blocks"""
        # Arrange
        mock_response = MagicMock()
        mock_response.text = '''{
    "verdict": "false",
    "confidence": 0.99,
    "explanation": "The Earth is not flat; it is an oblate spheroid.",
    "sources": ["NASA", "Satellite imagery", "Scientific consensus"]
}'''
        
        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model
        
        mock_embedding_model = MagicMock()
        mock_transformer.return_value = mock_embedding_model
        
        fact_checker = FactChecker()
        
        # Act
        result = fact_checker.verify_claim("The Earth is flat")
        
        # Assert
        assert result['verdict'] == 'false'
        assert result['confidence'] == 0.99
        assert 'oblate spheroid' in result['explanation']
        assert len(result['sources']) == 3


class TestFactCheckerJSONParsing:
    """Test JSON parsing and fallback behavior"""
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'gemini',
        'GEMINI_API_KEY': 'test_key'
    })
    @patch('services.llm_client.genai')
    @patch('services.fact_checker.SentenceTransformer')
    def test_json_parsing_fallback(self, mock_transformer, mock_genai):
        """Test fallback when LLM returns malformed JSON (Requirement 4.4)"""
        # Arrange
        mock_response = MagicMock()
        mock_response.text = "This is not valid JSON, just plain text response"
        
        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model
        
        mock_embedding_model = MagicMock()
        mock_transformer.return_value = mock_embedding_model
        
        fact_checker = FactChecker()
        
        # Act
        result = fact_checker.verify_claim("Test claim")
        
        # Assert - Fallback should return uncertain verdict
        assert result['verdict'] == 'uncertain'
        assert result['confidence'] == 0.5
        assert result['explanation'] == "This is not valid JSON, just plain text response"
        assert result['sources'] == []
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'gemini',
        'GEMINI_API_KEY': 'test_key'
    })
    @patch('services.llm_client.genai')
    @patch('services.fact_checker.SentenceTransformer')
    def test_json_parsing_with_generic_markdown(self, mock_transformer, mock_genai):
        """Test JSON parsing when wrapped in generic markdown code blocks"""
        # Arrange
        mock_response = MagicMock()
        mock_response.text = '''```
{
    "verdict": "uncertain",
    "confidence": 0.6,
    "explanation": "Insufficient evidence to determine.",
    "sources": []
}
```'''
        
        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model
        
        mock_embedding_model = MagicMock()
        mock_transformer.return_value = mock_embedding_model
        
        fact_checker = FactChecker()
        
        # Act
        result = fact_checker.verify_claim("Test claim")
        
        # Assert
        assert result['verdict'] == 'uncertain'
        assert result['confidence'] == 0.6
        assert 'Insufficient evidence' in result['explanation']
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'gemini',
        'GEMINI_API_KEY': 'test_key'
    })
    @patch('services.llm_client.genai')
    @patch('services.fact_checker.SentenceTransformer')
    def test_json_parsing_with_missing_fields(self, mock_transformer, mock_genai):
        """Test validation when JSON is missing required fields"""
        # Arrange
        mock_response = MagicMock()
        mock_response.text = '''{"verdict": "true"}'''  # Missing other fields
        
        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model
        
        mock_embedding_model = MagicMock()
        mock_transformer.return_value = mock_embedding_model
        
        fact_checker = FactChecker()
        
        # Act
        result = fact_checker.verify_claim("Test claim")
        
        # Assert - Should fill in missing fields with defaults
        assert result['verdict'] == 'true'
        assert result['confidence'] == 0.5  # Default
        assert result['explanation'] != ''  # Should have raw response
        assert result['sources'] == []  # Default empty list
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'gemini',
        'GEMINI_API_KEY': 'test_key'
    })
    @patch('services.llm_client.genai')
    @patch('services.fact_checker.SentenceTransformer')
    def test_json_parsing_with_invalid_verdict(self, mock_transformer, mock_genai):
        """Test validation when verdict is invalid"""
        # Arrange
        mock_response = MagicMock()
        mock_response.text = '''{
    "verdict": "maybe",
    "confidence": 0.7,
    "explanation": "Test",
    "sources": []
}'''
        
        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model
        
        mock_embedding_model = MagicMock()
        mock_transformer.return_value = mock_embedding_model
        
        fact_checker = FactChecker()
        
        # Act
        result = fact_checker.verify_claim("Test claim")
        
        # Assert - Should normalize to "uncertain"
        assert result['verdict'] == 'uncertain'
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'gemini',
        'GEMINI_API_KEY': 'test_key'
    })
    @patch('services.llm_client.genai')
    @patch('services.fact_checker.SentenceTransformer')
    def test_json_parsing_with_out_of_range_confidence(self, mock_transformer, mock_genai):
        """Test validation when confidence is out of range"""
        # Arrange
        mock_response = MagicMock()
        mock_response.text = '''{
    "verdict": "true",
    "confidence": 1.5,
    "explanation": "Test",
    "sources": []
}'''
        
        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model
        
        mock_embedding_model = MagicMock()
        mock_transformer.return_value = mock_embedding_model
        
        fact_checker = FactChecker()
        
        # Act
        result = fact_checker.verify_claim("Test claim")
        
        # Assert - Should clamp to 1.0
        assert result['confidence'] == 1.0


class TestFactCheckerErrorHandling:
    """Test error handling in fact verification"""
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'gemini',
        'GEMINI_API_KEY': 'test_key'
    })
    @patch('services.llm_client.genai')
    @patch('services.fact_checker.SentenceTransformer')
    def test_llm_error_handling(self, mock_transformer, mock_genai):
        """Test error handling when LLM API fails (Requirement 4.5)"""
        # Arrange
        mock_model = MagicMock()
        mock_model.generate_content.side_effect = Exception("API rate limit exceeded")
        mock_genai.GenerativeModel.return_value = mock_model
        
        mock_embedding_model = MagicMock()
        mock_transformer.return_value = mock_embedding_model
        
        fact_checker = FactChecker()
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            fact_checker.verify_claim("Test claim")
        
        assert "API rate limit exceeded" in str(exc_info.value)
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'gemini',
        'GEMINI_API_KEY': 'test_key'
    })
    @patch('services.llm_client.genai')
    @patch('services.fact_checker.SentenceTransformer')
    def test_llm_timeout_error(self, mock_transformer, mock_genai):
        """Test error handling when LLM times out"""
        # Arrange
        mock_model = MagicMock()
        mock_model.generate_content.side_effect = TimeoutError("Request timeout")
        mock_genai.GenerativeModel.return_value = mock_model
        
        mock_embedding_model = MagicMock()
        mock_transformer.return_value = mock_embedding_model
        
        fact_checker = FactChecker()
        
        # Act & Assert
        with pytest.raises(TimeoutError) as exc_info:
            fact_checker.verify_claim("Test claim")
        
        assert "Request timeout" in str(exc_info.value)


class TestFactCheckerValidation:
    """Test result validation logic"""
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'gemini',
        'GEMINI_API_KEY': 'test_key'
    })
    @patch('services.llm_client.genai')
    @patch('services.fact_checker.SentenceTransformer')
    def test_validate_result_with_non_list_sources(self, mock_transformer, mock_genai):
        """Test validation converts non-list sources to empty list"""
        # Arrange
        mock_response = MagicMock()
        mock_response.text = '''{
    "verdict": "true",
    "confidence": 0.8,
    "explanation": "Test",
    "sources": "Not a list"
}'''
        
        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model
        
        mock_embedding_model = MagicMock()
        mock_transformer.return_value = mock_embedding_model
        
        fact_checker = FactChecker()
        
        # Act
        result = fact_checker.verify_claim("Test claim")
        
        # Assert - Should convert to empty list
        assert result['sources'] == []
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'gemini',
        'GEMINI_API_KEY': 'test_key'
    })
    @patch('services.llm_client.genai')
    @patch('services.fact_checker.SentenceTransformer')
    def test_validate_result_with_negative_confidence(self, mock_transformer, mock_genai):
        """Test validation clamps negative confidence to 0.0"""
        # Arrange
        mock_response = MagicMock()
        mock_response.text = '''{
    "verdict": "true",
    "confidence": -0.5,
    "explanation": "Test",
    "sources": []
}'''
        
        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model
        
        mock_embedding_model = MagicMock()
        mock_transformer.return_value = mock_embedding_model
        
        fact_checker = FactChecker()
        
        # Act
        result = fact_checker.verify_claim("Test claim")
        
        # Assert - Should clamp to 0.0
        assert result['confidence'] == 0.0
