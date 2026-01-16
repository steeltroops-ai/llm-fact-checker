"""
LLM Comparison module for RAG pipeline.

This module compares claims against retrieved evidence using LLM reasoning.
It constructs evidence-based prompts and parses structured responses to
determine verdict, confidence, and reasoning.
"""

import json
import logging
from typing import List
from pydantic import BaseModel, Field

from services.llm_client import LLMClient
from services.vector_retriever import RetrievedFact

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ComparisonResult(BaseModel):
    """
    Result of LLM comparison between claim and evidence.
    
    Attributes:
        verdict: Classification as "true", "false", or "unverifiable"
        confidence: Confidence score from 0.0 to 1.0
        explanation: Human-readable explanation referencing evidence
        reasoning: Step-by-step reasoning process
    """
    verdict: str = Field(
        ...,
        description="Verdict: 'true', 'false', or 'unverifiable'",
        pattern="^(true|false|unverifiable)$"
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence score between 0.0 and 1.0"
    )
    explanation: str = Field(
        ...,
        min_length=1,
        description="Clear explanation referencing specific evidence"
    )
    reasoning: str = Field(
        ...,
        min_length=1,
        description="Step-by-step reasoning process"
    )


class LLMError(Exception):
    """Raised when LLM comparison fails."""
    pass


class LLMComparator:
    """
    Compare claims against evidence using LLM reasoning.
    
    This class constructs evidence-based prompts that include retrieved facts
    with similarity scores, sends them to an LLM, and parses the structured
    response to determine verdict and reasoning.
    
    Features:
        - Evidence-based prompt construction with PIB sources
        - Structured JSON response parsing
        - Confidence calculation from similarity scores
        - Handles contradictory or insufficient evidence
        - Returns "unverifiable" when evidence is unclear
    
    Example:
        >>> llm_client = LLMClient()
        >>> comparator = LLMComparator(llm_client)
        >>> evidence = [RetrievedFact(fact=fact1, similarity=0.85), ...]
        >>> result = comparator.compare("PM announced subsidies", evidence)
        >>> print(f"Verdict: {result.verdict}, Confidence: {result.confidence}")
    """
    
    def __init__(self, llm_client: LLMClient):
        """
        Initialize the LLM comparator.
        
        Args:
            llm_client: Configured LLM client (Gemini or OpenAI)
        """
        self.llm = llm_client
        logger.info("✅ LLMComparator initialized")
    
    def compare(
        self,
        claim: str,
        evidence: List[RetrievedFact]
    ) -> ComparisonResult:
        """
        Compare claim against retrieved evidence using LLM.
        
        This method:
        1. Checks if evidence is available
        2. Constructs an evidence-based prompt
        3. Calls the LLM to analyze the claim
        4. Parses the structured response
        5. Returns verdict with reasoning
        
        Args:
            claim: The claim text to verify
            evidence: List of retrieved facts with similarity scores
            
        Returns:
            ComparisonResult with verdict, confidence, explanation, and reasoning
            
        Raises:
            LLMError: If comparison fails or input is invalid
            
        Example:
            >>> result = comparator.compare(
            ...     "Government announced free electricity",
            ...     retrieved_facts
            ... )
            >>> if result.verdict == "true":
            ...     print(f"Claim verified with {result.confidence:.0%} confidence")
        """
        # Validate input
        if not claim or not isinstance(claim, str):
            raise LLMError("Claim must be a non-empty string")
        
        claim = claim.strip()
        if len(claim) == 0:
            raise LLMError("Claim cannot be empty or whitespace only")
        
        # Handle case with no evidence
        if not evidence or len(evidence) == 0:
            logger.info("⚠️ No evidence provided, returning 'unverifiable'")
            return ComparisonResult(
                verdict="unverifiable",
                confidence=0.0,
                explanation="No relevant evidence found in the fact base to verify this claim.",
                reasoning="Insufficient evidence: The fact base does not contain any statements similar enough to this claim for verification."
            )
        
        logger.info(f"🔍 Comparing claim against {len(evidence)} evidence items...")
        
        try:
            # Build evidence-based prompt
            prompt = self._build_prompt(claim, evidence)
            
            # Get LLM response
            logger.info("🤖 Calling LLM for comparison...")
            response = self.llm.generate(prompt)
            
            # Parse response into structured result
            result = self._parse_response(response, evidence)
            
            logger.info(
                f"✅ Comparison complete: verdict='{result.verdict}', "
                f"confidence={result.confidence:.2f}"
            )
            
            return result
            
        except Exception as e:
            logger.error(f"❌ LLM comparison failed: {str(e)}")
            raise LLMError(f"Failed to compare claim with evidence: {str(e)}") from e
    
    def _build_prompt(self, claim: str, evidence: List[RetrievedFact]) -> str:
        """
        Build evidence-based prompt for LLM.
        
        The prompt includes:
        - The claim to verify
        - Retrieved evidence with similarity scores and sources
        - Classification instructions
        - Request for structured JSON response
        - Guidelines for objective analysis
        
        Args:
            claim: The claim text to verify
            evidence: List of retrieved facts with similarity scores
            
        Returns:
            Formatted prompt string for LLM
        """
        # Format evidence with similarity scores and sources
        evidence_text = "\n\n".join([
            f"Evidence {i+1} (Similarity: {e.similarity:.2f}):\n"
            f"Claim: {e.fact.claim}\n"
            f"Source: {e.fact.source}\n"
            f"Date: {e.fact.publication_date}\n"
            f"Category: {e.fact.category}"
            for i, e in enumerate(evidence)
        ])
        
        # Construct comprehensive prompt
        prompt = f"""You are an expert fact-checker analyzing claims against verified evidence from the Press Information Bureau (PIB) of India.

**Claim to Verify:**
"{claim}"

**Retrieved Evidence from PIB:**
{evidence_text}

**Task:**
Compare the claim against the provided evidence and classify it as:
- "true": The claim is supported by the evidence
- "false": The claim contradicts the evidence
- "unverifiable": The evidence is insufficient, unclear, or contradictory

Provide your response in this exact JSON format:
{{
    "verdict": "true" or "false" or "unverifiable",
    "confidence": 0.0 to 1.0,
    "explanation": "Clear explanation referencing specific evidence",
    "reasoning": "Step-by-step reasoning process"
}}

**Guidelines:**
1. Base your verdict ONLY on the provided evidence
2. Reference specific evidence items in your explanation (e.g., "Evidence 1 states...")
3. Consider similarity scores when weighing evidence (higher scores = more relevant)
4. Be objective and avoid speculation beyond the evidence
5. If evidence is contradictory, unclear, or doesn't directly address the claim, use "unverifiable"
6. For confidence: consider both similarity scores and how well evidence addresses the claim
7. Provide clear reasoning that explains your decision-making process

**Important:** Return ONLY the JSON object, no additional text."""
        
        return prompt
    
    def _parse_response(
        self,
        response: str,
        evidence: List[RetrievedFact]
    ) -> ComparisonResult:
        """
        Parse LLM response into structured ComparisonResult.
        
        This method:
        1. Extracts JSON from the response (handles markdown code blocks)
        2. Validates the JSON structure
        3. Calculates confidence if not provided or invalid
        4. Returns a validated ComparisonResult
        
        Args:
            response: Raw LLM response text
            evidence: Evidence used for comparison (for confidence calculation)
            
        Returns:
            Validated ComparisonResult object
            
        Raises:
            LLMError: If parsing fails completely
        """
        try:
            # Extract JSON from response (handle markdown code blocks)
            json_str = response.strip()
            
            # Remove markdown code blocks if present
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0].strip()
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0].strip()
            
            # Parse JSON
            data = json.loads(json_str)
            
            # Validate required fields
            if "verdict" not in data:
                raise ValueError("Missing 'verdict' field in response")
            if "explanation" not in data:
                raise ValueError("Missing 'explanation' field in response")
            if "reasoning" not in data:
                raise ValueError("Missing 'reasoning' field in response")
            
            # Normalize verdict to lowercase
            data["verdict"] = data["verdict"].lower()
            
            # Validate verdict value
            if data["verdict"] not in ["true", "false", "unverifiable"]:
                logger.warning(
                    f"⚠️ Invalid verdict '{data['verdict']}', defaulting to 'unverifiable'"
                )
                data["verdict"] = "unverifiable"
            
            # Calculate confidence if not provided or invalid
            if "confidence" not in data or data["confidence"] is None:
                data["confidence"] = self._calculate_confidence(
                    data["verdict"],
                    evidence
                )
            else:
                # Ensure confidence is in valid range
                data["confidence"] = max(0.0, min(1.0, float(data["confidence"])))
            
            # Create and return validated result
            return ComparisonResult(**data)
            
        except json.JSONDecodeError as e:
            logger.error(f"⚠️ Failed to parse JSON from LLM response: {e}")
            logger.debug(f"Raw response: {response[:500]}...")
            
            # Fallback: return unverifiable with raw response as explanation
            return ComparisonResult(
                verdict="unverifiable",
                confidence=0.5,
                explanation=response[:500] if len(response) > 500 else response,
                reasoning="Failed to parse structured response from LLM. The response format was invalid."
            )
            
        except Exception as e:
            logger.error(f"⚠️ Error parsing LLM response: {e}")
            
            # Fallback: return unverifiable
            return ComparisonResult(
                verdict="unverifiable",
                confidence=0.5,
                explanation="An error occurred while processing the LLM response.",
                reasoning=f"Error during response parsing: {str(e)}"
            )
    
    def _calculate_confidence(
        self,
        verdict: str,
        evidence: List[RetrievedFact]
    ) -> float:
        """
        Calculate confidence score based on evidence quality.
        
        Confidence is calculated based on:
        - Average similarity score of evidence
        - Number of evidence items
        - Verdict type (unverifiable gets lower confidence)
        
        Args:
            verdict: The verdict ("true", "false", or "unverifiable")
            evidence: List of retrieved facts with similarity scores
            
        Returns:
            Confidence score between 0.0 and 1.0
        """
        if not evidence or len(evidence) == 0:
            return 0.0
        
        # Calculate average similarity score
        avg_similarity = sum(e.similarity for e in evidence) / len(evidence)
        
        # Adjust based on verdict type
        if verdict == "unverifiable":
            # Lower confidence for unverifiable claims
            confidence = min(avg_similarity * 0.7, 0.6)
        else:
            # For true/false verdicts, use similarity as base
            confidence = avg_similarity
            
            # Boost confidence if we have multiple high-similarity evidence items
            high_similarity_count = sum(1 for e in evidence if e.similarity > 0.7)
            if high_similarity_count >= 2:
                confidence = min(confidence * 1.1, 1.0)
        
        # Ensure confidence is in valid range
        return max(0.0, min(1.0, confidence))
