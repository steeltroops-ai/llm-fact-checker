import os
import google.generativeai as genai
from openai import OpenAI

class LLMClient:
    """Client for interacting with LLM providers (Gemini or OpenAI)"""
    
    def __init__(self):
        # Validate environment variables on startup
        self.provider = self._validate_provider()
        
        if self.provider == 'gemini':
            api_key = self._validate_api_key('GEMINI_API_KEY')
            genai.configure(api_key=api_key)
            model_name = os.getenv('MODEL_NAME', 'gemini-2.5-flash')
            self.model = genai.GenerativeModel(model_name)
            print(f"✅ Initialized Gemini LLM client (model: {model_name})")
        elif self.provider == 'openai':
            api_key = self._validate_api_key('OPENAI_API_KEY')
            self.client = OpenAI(api_key=api_key)
            self.model_name = os.getenv('MODEL_NAME', 'gpt-4-turbo-preview')
            print(f"✅ Initialized OpenAI LLM client (model: {self.model_name})")
        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider}")
    
    def _validate_provider(self) -> str:
        """Validate LLM_PROVIDER environment variable"""
        provider = os.getenv('LLM_PROVIDER', 'gemini').lower()
        
        if provider not in ['gemini', 'openai']:
            raise ValueError(
                f"Invalid LLM_PROVIDER: '{provider}'. Must be 'gemini' or 'openai'"
            )
        
        return provider
    
    def _validate_api_key(self, key_name: str) -> str:
        """Validate API key environment variable"""
        api_key = os.getenv(key_name)
        
        if not api_key:
            raise ValueError(
                f"Missing {key_name} environment variable. "
                f"Please set it in your .env file or environment."
            )
        
        if not api_key.strip():
            raise ValueError(f"{key_name} is empty. Please provide a valid API key.")
        
        return api_key
    
    def generate(self, prompt: str) -> str:
        """Generate text using configured LLM"""
        if not prompt or not prompt.strip():
            raise ValueError("Prompt cannot be empty")
        
        try:
            if self.provider == 'gemini':
                response = self.model.generate_content(prompt)
                return response.text
            else:  # openai
                response = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.3
                )
                return response.choices[0].message.content
        except Exception as e:
            print(f"❌ LLM Error ({self.provider}): {str(e)}")
            raise

