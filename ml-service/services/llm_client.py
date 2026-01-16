import os
import logging
import google.generativeai as genai
from openai import OpenAI

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class LLMClient:
    """
    Client for interacting with LLM providers.
    
    Supported providers:
    - gemini: Google Gemini API
    - openai: OpenAI GPT API
    - ollama: Local Ollama models (Mistral, Llama, etc.)
    """
    
    SUPPORTED_PROVIDERS = ['gemini', 'openai', 'ollama']
    
    def __init__(self):
        """Initialize LLM client with configured provider."""
        self.provider = self._validate_provider()
        self._setup_client()
    
    def _validate_provider(self) -> str:
        """Validate LLM_PROVIDER environment variable."""
        provider = os.getenv('LLM_PROVIDER', 'gemini').lower()
        
        if provider not in self.SUPPORTED_PROVIDERS:
            raise ValueError(
                f"Invalid LLM_PROVIDER: '{provider}'. "
                f"Must be one of: {', '.join(self.SUPPORTED_PROVIDERS)}"
            )
        
        return provider
    
    def _validate_api_key(self, key_name: str) -> str:
        """Validate API key environment variable."""
        api_key = os.getenv(key_name)
        
        if not api_key:
            raise ValueError(
                f"Missing {key_name} environment variable. "
                f"Please set it in your .env file or environment."
            )
        
        if not api_key.strip():
            raise ValueError(f"{key_name} is empty. Please provide a valid API key.")
        
        return api_key
    
    def _setup_client(self):
        """Set up the appropriate LLM client based on provider."""
        if self.provider == 'gemini':
            self._setup_gemini()
        elif self.provider == 'openai':
            self._setup_openai()
        elif self.provider == 'ollama':
            self._setup_ollama()
    
    def _setup_gemini(self):
        """Configure Google Gemini client."""
        api_key = self._validate_api_key('GEMINI_API_KEY')
        genai.configure(api_key=api_key)
        model_name = os.getenv('MODEL_NAME', 'gemini-2.5-flash')
        self.model = genai.GenerativeModel(model_name)
        self.model_name = model_name
        logger.info(f"✅ Initialized Gemini LLM client (model: {model_name})")
    
    def _setup_openai(self):
        """Configure OpenAI client."""
        api_key = self._validate_api_key('OPENAI_API_KEY')
        self.client = OpenAI(api_key=api_key)
        self.model_name = os.getenv('MODEL_NAME', 'gpt-4-turbo-preview')
        logger.info(f"✅ Initialized OpenAI LLM client (model: {self.model_name})")
    
    def _setup_ollama(self):
        """Configure Ollama client for local LLM inference."""
        self.ollama_host = os.getenv('OLLAMA_HOST', 'http://localhost:11434')
        self.model_name = os.getenv('MODEL_NAME', 'mistral')
        
        # Test connection to Ollama
        try:
            import httpx
            response = httpx.get(f"{self.ollama_host}/api/tags", timeout=5.0)
            if response.status_code == 200:
                available_models = [m['name'] for m in response.json().get('models', [])]
                if self.model_name not in available_models and f"{self.model_name}:latest" not in available_models:
                    logger.warning(
                        f"⚠️ Model '{self.model_name}' not found in Ollama. "
                        f"Available: {available_models}. Will attempt to pull on first use."
                    )
            logger.info(f"✅ Initialized Ollama LLM client (model: {self.model_name}, host: {self.ollama_host})")
        except Exception as e:
            logger.warning(f"⚠️ Could not connect to Ollama at {self.ollama_host}: {e}")
            logger.info(f"✅ Initialized Ollama LLM client (model: {self.model_name}) - connection will be attempted on first use")
    
    def generate(self, prompt: str) -> str:
        """
        Generate text using configured LLM.
        
        Args:
            prompt: The prompt to send to the LLM
            
        Returns:
            Generated text response
            
        Raises:
            ValueError: If prompt is empty
            Exception: If LLM call fails
        """
        if not prompt or not prompt.strip():
            raise ValueError("Prompt cannot be empty")
        
        try:
            if self.provider == 'gemini':
                return self._generate_gemini(prompt)
            elif self.provider == 'openai':
                return self._generate_openai(prompt)
            elif self.provider == 'ollama':
                return self._generate_ollama(prompt)
        except Exception as e:
            logger.error(f"❌ LLM Error ({self.provider}): {str(e)}")
            raise
    
    def _generate_gemini(self, prompt: str) -> str:
        """Generate using Google Gemini."""
        response = self.model.generate_content(prompt)
        return response.text
    
    def _generate_openai(self, prompt: str) -> str:
        """Generate using OpenAI GPT."""
        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        return response.choices[0].message.content
    
    def _generate_ollama(self, prompt: str) -> str:
        """
        Generate using local Ollama model.
        
        This method calls the Ollama API to generate text using
        a locally running model (e.g., Mistral, Llama, Phi).
        """
        import httpx
        
        try:
            response = httpx.post(
                f"{self.ollama_host}/api/generate",
                json={
                    "model": self.model_name,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
                        "num_predict": 2048
                    }
                },
                timeout=120.0  # Local models can take longer
            )
            
            if response.status_code != 200:
                raise Exception(f"Ollama API error: {response.status_code} - {response.text}")
            
            result = response.json()
            return result.get('response', '')
            
        except httpx.ConnectError:
            raise Exception(
                f"Could not connect to Ollama at {self.ollama_host}. "
                "Please ensure Ollama is running: `ollama serve`"
            )
        except httpx.TimeoutException:
            raise Exception(
                f"Ollama request timed out. The model '{self.model_name}' may be loading. "
                "Try again or use a smaller model."
            )
