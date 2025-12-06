"""
Groq AI client for fast inference tasks.
"""

import json
from typing import Dict, Any, Optional, List
import httpx
from ..config import get_settings

settings = get_settings()


class GroqClient:
    """
    Client for Groq API.
    Used for fast inference tasks like quick validations and simple queries.
    """
    
    SYSTEM_PROMPT = """You are a hospital roster assistant. Provide quick, accurate responses about shifts, schedules, and roster rules. Be concise."""

    def __init__(self):
        """Initialize the Groq client."""
        self.api_key = settings.groq_api_key
        self.base_url = settings.groq_api_base_url
        self.max_tokens = min(settings.ai_max_tokens, 1000)  # Groq is for quick responses
        self.temperature = settings.ai_temperature
    
    async def quick_validate(
        self,
        shift: Dict[str, Any],
        doctor_shifts: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Quickly validate if a shift can be assigned.
        
        Args:
            shift: Proposed shift assignment
            doctor_shifts: Doctor's existing shifts
            
        Returns:
            Validation result.
        """
        prompt = f"""Quickly check if this shift assignment is valid:

PROPOSED SHIFT: {json.dumps(shift, default=str)}
EXISTING SHIFTS: {json.dumps(doctor_shifts, default=str)}

Rules:
- Minimum 11 hours rest between shifts
- No back-to-back night shifts
- Flexible doctors max 4 shifts/month

Respond with JSON:
{{"valid": boolean, "reason": "string if invalid"}}"""

        return await self._call_api(prompt)
    
    async def quick_answer(self, question: str) -> str:
        """
        Quick answer for simple roster questions.
        
        Args:
            question: User's question
            
        Returns:
            Quick response.
        """
        prompt = f"Answer briefly: {question}"
        result = await self._call_api(prompt, expect_json=False)
        return result.get("text", str(result))
    
    async def summarize_roster(
        self,
        roster_stats: Dict[str, Any]
    ) -> str:
        """
        Generate a quick summary of roster statistics.
        
        Args:
            roster_stats: Roster statistics
            
        Returns:
            Summary text.
        """
        prompt = f"""Summarize this roster in 2-3 sentences:
{json.dumps(roster_stats, default=str)}"""

        result = await self._call_api(prompt, expect_json=False)
        return result.get("text", str(result))
    
    async def _call_api(
        self,
        prompt: str,
        expect_json: bool = True
    ) -> Dict[str, Any]:
        """
        Make an API call to Groq.
        
        Args:
            prompt: The prompt to send
            expect_json: Whether to parse response as JSON
            
        Returns:
            API response.
        """
        if not self.api_key:
            return self._mock_response(prompt, expect_json)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": "llama3-8b-8192",
                        "messages": [
                            {"role": "system", "content": self.SYSTEM_PROMPT},
                            {"role": "user", "content": prompt}
                        ],
                        "max_tokens": self.max_tokens,
                        "temperature": self.temperature
                    },
                    timeout=30.0
                )
                
                response.raise_for_status()
                result = response.json()
                
                content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                if expect_json:
                    try:
                        start = content.find("{")
                        end = content.rfind("}") + 1
                        if start >= 0 and end > start:
                            return json.loads(content[start:end])
                    except json.JSONDecodeError:
                        pass
                
                return {"text": content}
                
        except Exception as e:
            return {"error": str(e), "text": f"AI service error: {str(e)}"}
    
    def _mock_response(self, prompt: str, expect_json: bool) -> Dict[str, Any]:
        """Generate mock response for development."""
        if expect_json:
            return {"valid": True, "reason": None, "mock": True}
        return {"text": "Mock Groq response - configure GROQ_API_KEY for real AI."}



