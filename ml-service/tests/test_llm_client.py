"""
Unit tests for LLM Client initialization and error handling
Tests Requirements: 8.1, 8.2, 8.4
"""
import pytest
import os
from unittest.mock import patch, MagicMock
from services.llm_client import LLMClient


class TestLLMClientInitialization:
    """Test LLM client initialization with different providers"""
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'gemini',
        'GEMINI_API_KEY': 'test_gemini_key_123'
    })
    @patch('services.llm_client.genai')
    def test_gemini_provider_initialization(self, mock_genai):
        """Test Gemini provider initialization with valid API key"""
        # Arrange
        mock_model = MagicMock()
        mock_genai.GenerativeModel.return_value = mock_model
        
        # Act
        client = LLMClient()
        
        # Assert
        assert client.provider == 'gemini'
        mock_genai.configure.assert_called_once_with(api_key='test_gemini_key_123')
        mock_genai.GenerativeModel.assert_called_once()
        assert client.model == mock_model
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'openai',
        'OPENAI_API_KEY': 'sk-test_openai_key_123'
    })
    @patch('services.llm_client.OpenAI')
    def test_openai_provider_initialization(self, mock_openai_class):
        """Test OpenAI provider initialization with valid API key"""
        # Arrange
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client
        
        # Act
        client = LLMClient()
        
        # Assert
        assert client.provider == 'openai'
        mock_openai_class.assert_called_once_with(api_key='sk-test_openai_key_123')
        assert client.client == mock_client
        assert client.model_name == 'gpt-4-turbo-preview'
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'openai',
        'OPENAI_API_KEY': 'sk-test_key',
        'MODEL_NAME': 'gpt-3.5-turbo'
    })
    @patch('services.llm_client.OpenAI')
    def test_custom_model_name(self, mock_openai_class):
        """Test initialization with custom model name"""
        # Arrange
        mock_client = MagicMock()
        mock_openai_class.return_value = mock_client
        
        # Act
        client = LLMClient()
        
        # Assert
        assert client.model_name == 'gpt-3.5-turbo'
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'gemini'
    }, clear=True)
    def test_missing_gemini_api_key(self):
        """Test error handling when GEMINI_API_KEY is missing"""
        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            LLMClient()
        
        assert "Missing GEMINI_API_KEY" in str(exc_info.value)
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'openai'
    }, clear=True)
    def test_missing_openai_api_key(self):
        """Test error handling when OPENAI_API_KEY is missing"""
        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            LLMClient()
        
        assert "Missing OPENAI_API_KEY" in str(exc_info.value)
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'gemini',
        'GEMINI_API_KEY': '   '
    })
    def test_empty_api_key(self):
        """Test error handling when API key is empty/whitespace"""
        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            LLMClient()
        
        assert "is empty" in str(exc_info.value)
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'invalid_provider',
        'GEMINI_API_KEY': 'test_key'
    })
    def test_invalid_provider(self):
        """Test error handling with invalid LLM provider"""
        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            LLMClient()
        
        assert "Invalid LLM_PROVIDER" in str(exc_info.value)
        assert "invalid_provider" in str(exc_info.value)
    
    @patch.dict(os.environ, {
        'GEMINI_API_KEY': 'test_key'
    }, clear=True)
    @patch('services.llm_client.genai')
    def test_default_provider_is_gemini(self, mock_genai):
        """Test that default provider is Gemini when LLM_PROVIDER not set"""
        # Arrange
        mock_model = MagicMock()
        mock_genai.GenerativeModel.return_value = mock_model
        
        # Act
        client = LLMClient()
        
        # Assert
        assert client.provider == 'gemini'


class TestLLMClientGenerate:
    """Test LLM client text generation"""
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'gemini',
        'GEMINI_API_KEY': 'test_key'
    })
    @patch('services.llm_client.genai')
    def test_generate_with_gemini(self, mock_genai):
        """Test text generation with Gemini provider"""
        # Arrange
        mock_response = MagicMock()
        mock_response.text = "Generated response from Gemini"
        mock_model = MagicMock()
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model
        
        client = LLMClient()
        
        # Act
        result = client.generate("Test prompt")
        
        # Assert
        assert result == "Generated response from Gemini"
        mock_model.generate_content.assert_called_once_with("Test prompt")
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'openai',
        'OPENAI_API_KEY': 'sk-test_key'
    })
    @patch('services.llm_client.OpenAI')
    def test_generate_with_openai(self, mock_openai_class):
        """Test text generation with OpenAI provider"""
        # Arrange
        mock_choice = MagicMock()
        mock_choice.message.content = "Generated response from OpenAI"
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_response
        mock_openai_class.return_value = mock_client
        
        client = LLMClient()
        
        # Act
        result = client.generate("Test prompt")
        
        # Assert
        assert result == "Generated response from OpenAI"
        mock_client.chat.completions.create.assert_called_once()
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'gemini',
        'GEMINI_API_KEY': 'test_key'
    })
    @patch('services.llm_client.genai')
    def test_generate_with_empty_prompt(self, mock_genai):
        """Test error handling when prompt is empty"""
        # Arrange
        mock_model = MagicMock()
        mock_genai.GenerativeModel.return_value = mock_model
        client = LLMClient()
        
        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            client.generate("")
        
        assert "Prompt cannot be empty" in str(exc_info.value)
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'gemini',
        'GEMINI_API_KEY': 'test_key'
    })
    @patch('services.llm_client.genai')
    def test_generate_with_whitespace_prompt(self, mock_genai):
        """Test error handling when prompt is only whitespace"""
        # Arrange
        mock_model = MagicMock()
        mock_genai.GenerativeModel.return_value = mock_model
        client = LLMClient()
        
        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            client.generate("   ")
        
        assert "Prompt cannot be empty" in str(exc_info.value)
    
    @patch.dict(os.environ, {
        'LLM_PROVIDER': 'gemini',
        'GEMINI_API_KEY': 'test_key'
    })
    @patch('services.llm_client.genai')
    def test_generate_handles_llm_error(self, mock_genai):
        """Test error handling when LLM API fails"""
        # Arrange
        mock_model = MagicMock()
        mock_model.generate_content.side_effect = Exception("API Error")
        mock_genai.GenerativeModel.return_value = mock_model
        
        client = LLMClient()
        
        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            client.generate("Test prompt")
        
        assert "API Error" in str(exc_info.value)
