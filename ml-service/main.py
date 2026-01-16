from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from services.fact_checker import FactChecker
import os
import json
from datetime import datetime
from pathlib import Path
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

# Feedback storage file
FEEDBACK_FILE = Path("logs/feedback.jsonl")
FEEDBACK_FILE.parent.mkdir(parents=True, exist_ok=True)

# Validate environment variables on startup
def validate_environment():
    """Validate required environment variables and log configuration"""
    print('🔍 Validating environment configuration...')
    
    errors = []
    warnings = []
    
    # Check LLM Provider (now supports ollama)
    provider = os.getenv('LLM_PROVIDER', 'gemini').lower()
    
    if provider not in ['gemini', 'openai', 'ollama']:
        errors.append(f"Invalid LLM_PROVIDER: '{provider}'. Must be 'gemini', 'openai', or 'ollama'")
    else:
        print(f"   LLM Provider: {provider}")
    
    # Check API Keys (not required for Ollama)
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
    elif provider == 'ollama':
        ollama_host = os.getenv('OLLAMA_HOST', 'http://localhost:11434')
        print(f"   Ollama Host: {ollama_host}")
        print(f"   ℹ️  Using local Ollama for LLM inference (no API key required)")
    
    # Check Model Configuration
    default_models = {
        'gemini': 'gemini-2.5-flash',
        'openai': 'gpt-4-turbo-preview',
        'ollama': 'mistral'
    }
    model_name = os.getenv('MODEL_NAME', default_models.get(provider, 'gemini-2.5-flash'))
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

# Initialize fact checker and RAG pipeline
print("🚀 Starting ML Fact Checker Service...")
try:
    validate_environment()
    fact_checker = FactChecker()
    
    # Initialize RAG pipeline components
    print("🔧 Initializing RAG pipeline...")
    from services.claim_extractor import ClaimExtractor
    from services.fact_base_manager import FactBaseManager
    from services.vector_retriever import VectorRetriever
    from services.llm_comparator import LLMComparator
    from services.rag_pipeline import RAGPipeline
    from services.llm_client import LLMClient
    
    # Initialize components
    claim_extractor = ClaimExtractor()
    fact_base_manager = FactBaseManager()
    facts = fact_base_manager.load()
    
    vector_retriever = VectorRetriever(
        facts=facts,
        embedding_model=fact_base_manager.embedding_model,
        similarity_threshold=float(os.getenv('SIMILARITY_THRESHOLD', '0.3')),
        top_k=int(os.getenv('TOP_K_RESULTS', '5'))
    )
    
    llm_client = LLMClient()
    llm_comparator = LLMComparator(llm_client)
    
    rag_pipeline = RAGPipeline(
        claim_extractor=claim_extractor,
        fact_base_manager=fact_base_manager,
        vector_retriever=vector_retriever,
        llm_comparator=llm_comparator
    )
    
    print("✅ Service ready (with RAG pipeline)")
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


class FeedbackRequest(BaseModel):
    """Request model for user feedback on verification results"""
    claim_id: str = Field(..., description="Unique identifier for the claim (hash of claim text)")
    claim: str = Field(..., description="The original claim text")
    verdict: str = Field(..., description="The verdict that was given")
    helpful: bool = Field(..., description="Whether the user found the result helpful")
    comment: str = Field(default="", description="Optional user comment")
    
    class Config:
        json_schema_extra = {
            "example": {
                "claim_id": "abc123",
                "claim": "Water boils at 100 degrees Celsius",
                "verdict": "true",
                "helpful": True,
                "comment": "Very accurate!"
            }
        }


class FeedbackResponse(BaseModel):
    """Response model for feedback submission"""
    success: bool
    message: str
    feedback_id: str


@app.get("/")
def read_root():
    provider = os.getenv('LLM_PROVIDER', 'gemini').lower()
    return {
        "message": "ML Fact Checker Service",
        "status": "ready",
        "version": "1.1.0",
        "llm_provider": provider,
        "features": ["rag", "feedback", "local_llm" if provider == "ollama" else "cloud_llm"]
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/verify", response_model=VerificationResponse)
async def verify_claim(request: ClaimRequest):
    """Verify a claim using ML-based fact checking (legacy endpoint)"""
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


@app.post("/rag/verify")
async def verify_claim_rag(request: ClaimRequest):
    """Verify a claim using RAG pipeline (claim extraction + vector retrieval + LLM comparison)"""
    try:
        # Validate input
        if not request.claim or len(request.claim.strip()) == 0:
            raise HTTPException(status_code=400, detail="Claim cannot be empty")
        
        if len(request.claim) > 2000:
            raise HTTPException(status_code=400, detail="Claim too long (max 2000 characters)")
        
        # Execute RAG pipeline (synchronous call)
        response = rag_pipeline.verify(request.claim)
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ RAG verification error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"RAG verification failed: {str(e)}")


@app.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(request: FeedbackRequest):
    """
    Submit user feedback for a verification result.
    
    This endpoint logs user feedback to help improve the system.
    Feedback is stored in a JSONL file for later analysis.
    """
    try:
        # Create feedback entry
        feedback_id = f"fb_{datetime.now().strftime('%Y%m%d%H%M%S')}_{request.claim_id[:8]}"
        
        feedback_entry = {
            "feedback_id": feedback_id,
            "claim_id": request.claim_id,
            "claim": request.claim,
            "verdict": request.verdict,
            "helpful": request.helpful,
            "comment": request.comment,
            "timestamp": datetime.now().isoformat(),
        }
        
        # Append to feedback file (JSONL format)
        with open(FEEDBACK_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(feedback_entry) + "\n")
        
        print(f"📝 Feedback received: {feedback_id} - {'👍' if request.helpful else '👎'}")
        
        return FeedbackResponse(
            success=True,
            message="Thank you for your feedback!",
            feedback_id=feedback_id
        )
        
    except Exception as e:
        print(f"❌ Feedback error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to save feedback: {str(e)}")


@app.get("/feedback/stats")
async def get_feedback_stats():
    """Get aggregated feedback statistics."""
    try:
        if not FEEDBACK_FILE.exists():
            return {
                "total": 0,
                "helpful": 0,
                "not_helpful": 0,
                "helpful_rate": 0.0
            }
        
        total = 0
        helpful = 0
        
        with open(FEEDBACK_FILE, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    entry = json.loads(line)
                    total += 1
                    if entry.get("helpful"):
                        helpful += 1
        
        return {
            "total": total,
            "helpful": helpful,
            "not_helpful": total - helpful,
            "helpful_rate": helpful / total if total > 0 else 0.0
        }
        
    except Exception as e:
        print(f"❌ Stats error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

