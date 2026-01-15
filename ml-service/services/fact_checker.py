from sentence_transformers import SentenceTransformer
from .llm_client import LLMClient
import json
import re

class FactChecker:
    """Fact checking service using LLM and embeddings"""
    
    def __init__(self):
        self.llm = LLMClient()
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        print("✅ Fact checker initialized with embedding model")
    
    def verify_claim(self, claim: str) -> dict:
        """Verify a claim using LLM"""
        print(f"🔍 Verifying claim: {claim[:100]}...")
        
        # Create structured prompt for LLM
        prompt = f"""You are an expert fact-checker. Analyze the following claim and provide a detailed, objective assessment.

Claim: "{claim}"

Provide your response in this exact JSON format:
{{
    "verdict": "true" or "false" or "uncertain",
    "confidence": 0.0 to 1.0,
    "explanation": "detailed explanation of your reasoning",
    "sources": ["source1", "source2", "source3"]
}}

Guidelines:
- verdict: "true" if scientifically/factually accurate, "false" if incorrect, "uncertain" if not enough evidence
- confidence: 0.0 to 1.0 based on certainty (0.9+ for well-established facts, 0.5-0.7 for uncertain)
- explanation: Clear reasoning with specific details
- sources: List relevant knowledge domains or reference types (e.g., "Scientific consensus", "Historical records")

Be objective and base your verdict on verifiable facts and scientific consensus."""

        try:
            # Get LLM response
            response = self.llm.generate(prompt)
            print(f"📝 LLM Response received ({len(response)} chars)")
            
            # Parse JSON from response (handle markdown code blocks)
            result = self._parse_json_response(response)
            
            # Validate and normalize result
            result = self._validate_result(result, response)
            
            print(f"✅ Verdict: {result['verdict']} (confidence: {result['confidence']:.2f})")
            return result
            
        except Exception as e:
            print(f"❌ Verification error: {str(e)}")
            raise
    
    def _parse_json_response(self, response: str) -> dict:
        """Parse JSON from LLM response, handling markdown code blocks"""
        try:
            # Try to extract JSON from markdown code blocks
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0].strip()
            else:
                # Try to find JSON object in response
                json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response, re.DOTALL)
                if json_match:
                    json_str = json_match.group(0)
                else:
                    json_str = response.strip()
            
            return json.loads(json_str)
            
        except json.JSONDecodeError as e:
            print(f"⚠️ JSON parse error: {e}")
            # Return fallback structure
            return {
                "verdict": "uncertain",
                "confidence": 0.5,
                "explanation": response,
                "sources": []
            }
    
    def _validate_result(self, result: dict, raw_response: str) -> dict:
        """Validate and normalize the result structure"""
        # Ensure all required fields exist
        if "verdict" not in result or result["verdict"] not in ["true", "false", "uncertain"]:
            result["verdict"] = "uncertain"
        
        if "confidence" not in result:
            result["confidence"] = 0.5
        else:
            # Ensure confidence is between 0 and 1
            result["confidence"] = max(0.0, min(1.0, float(result["confidence"])))
        
        if "explanation" not in result or not result["explanation"]:
            result["explanation"] = raw_response
        
        if "sources" not in result or not isinstance(result["sources"], list):
            result["sources"] = []
        
        return result
