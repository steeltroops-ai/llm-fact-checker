from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.fact_checker import FactChecker
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="ML Fact Checker Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Validate environment variables on startup
def validate_environment():
    """Validate required environment variables and log configuration"""
    print('🔍 Validating environment configuration...')
    
    errors = []
    warnings = []
    
    # Check LLM Provider
    provider = os.getenv('LLM_PROVIDER', 'gemini').lower()
    
    if provider not in ['gemini', 'openai']:
        errors.append(f"Invalid LLM_PROVIDER: '{provider}'. Must be 'gemini' or 'openai'")
    else:
        print(f"   LLM Provider: {provider}")
    
    # Check API Keys
    if provider == 'gemini':
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            errors.append("Missing GEMINI_API_KEY environment variable")
        elif api_key == 'your_gemini_api_key_here':
            errors.append("GEMINI_API_KEY is set to placeholder value. Please add your actual API key.")
        else:
            print(f"   Gemini API Key: {'*' * 20}{api_key[-4:]}")
    elif provider == 'openai':
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            errors.append("Missing OPENAI_API_KEY environment variable")
        elif api_key == 'your_openai_api_key_here':
            errors.append("OPENAI_API_KEY is set to placeholder value. Please add your actual API key.")
        else:
            print(f"   OpenAI API Key: {'*' * 20}{api_key[-4:]}")
    
    # Check Model Configuration
    model_name = os.getenv('MODEL_NAME', 'gemini-pro' if provider == 'gemini' else 'gpt-4-turbo-preview')
    print(f"   Model Name: {model_name}")
    
    embedding_model = os.getenv('EMBEDDING_MODEL', 'all-MiniLM-L6-v2')
    print(f"   Embedding Model: {embedding_model}")
    
    # Check Port
    port = os.getenv('PORT', '8001')
    print(f"   Port: {port}")
    
    # Display warnings
    if warnings:
        print('\n⚠️  Warnings:')
        for warning in warnings:
            print(f"   - {warning}")
    
    # Display errors and exit if any
    if errors:
        print('\n❌ Environment validation failed:')
        for error in errors:
            print(f"   - {error}")
        print('\nPlease check your .env file and ensure all required variables are set.')
        print('See .env.example for reference.\n')
        raise ValueError("Environment validation failed")
    
    print('✅ Environment validation passed\n')

# Initialize fact checker
print("🚀 Starting ML Fact Checker Service...")
try:
    validate_environment()
    fact_checker = FactChecker()
    print("✅ Service ready")
except Exception as e:
    print(f"❌ Failed to initialize: {str(e)}")
    raise

class ClaimRequest(BaseModel):
    """Request model for claim verification"""
    claim: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "claim": "Water boils at 100 degrees Celsius at sea level"
            }
        }

class VerificationResponse(BaseModel):
    """Response model for claim verification results"""
    claim: str
    verdict: str  # 'true', 'false', or 'uncertain'
    confidence: float  # 0.0 to 1.0
    explanation: str
    sources: list[str]
    
    class Config:
        json_schema_extra = {
            "example": {
                "claim": "Water boils at 100 degrees Celsius at sea level",
                "verdict": "true",
                "confidence": 0.95,
                "explanation": "This is scientifically accurate. Water boils at 100°C (212°F) at sea level under standard atmospheric pressure.",
                "sources": ["Scientific consensus", "Physics textbooks"]
            }
        }

@app.get("/")
def read_root():
    return {
        "message": "ML Fact Checker Service",
        "status": "ready",
        "version": "1.0.0"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/verify", response_model=VerificationResponse)
async def verify_claim(request: ClaimRequest):
    """Verify a claim using ML-based fact checking"""
    try:
        # Validate input
        if not request.claim or len(request.claim.strip()) == 0:
            raise HTTPException(status_code=400, detail="Claim cannot be empty")
        
        if len(request.claim) > 1000:
            raise HTTPException(status_code=400, detail="Claim too long (max 1000 characters)")
        
        # Verify the claim
        result = fact_checker.verify_claim(request.claim)
        
        return VerificationResponse(
            claim=request.claim,
            verdict=result["verdict"],
            confidence=result["confidence"],
            explanation=result["explanation"],
            sources=result["sources"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Verification error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
