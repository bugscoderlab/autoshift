"""
Claude AI client for primary reasoning tasks.
"""

import json
from typing import Dict, Any, Optional, List
import httpx
from ..config import get_settings

settings = get_settings()


class ClaudeClient:
    """
    Client for Anthropic's Claude API.
    Used for complex reasoning, roster generation, and explanations.
    """
    
    SYSTEM_PROMPT = """You are an intelligent hospital roster assistant for a hospital with 70-80 doctors.
Your role is to generate optimal monthly rosters that merge fixed-shift and flexible-shift doctors.

RULES TO OBEY:
1. Fixed doctors follow their weekly pattern; rotate starting week monthly (week 1-4)
2. Flexible doctors:
   - Maximum 4 confirmed shifts per month
   - Minimum 11 hours rest between consecutive shifts
   - Leave/off-days are prorated based on FTE
   - Workload must be balanced fairly across all shift types
3. No back-to-back night shifts for any doctor
4. CRITICAL: EVERY shift type (morning, evening, night) MUST be filled for EVERY day of the month. No shift can be left empty.
5. Ensure minimum staffing per shift (at least 2 doctors, must have one permanent doctor in each shift)
6. Respect all approved leave and shift requests

Always respond with valid JSON that can be parsed."""

    def __init__(self):
        """Initialize the Claude client."""
        self.api_key = settings.claude_api_key
        self.base_url = settings.claude_api_base_url
        self.max_tokens = settings.ai_max_tokens
        self.temperature = settings.ai_temperature
    
    async def generate_roster(
        self,
        year: int,
        month: int,
        doctors: List[Dict[str, Any]],
        shift_requests: List[Dict[str, Any]],
        leave_list: List[Dict[str, Any]],
        existing_patterns: Dict[int, Dict[str, Any]],
        rules: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate a monthly roster using Claude.
        
        Args:
            year: Year for roster
            month: Month for roster (1-12)
            doctors: List of doctor information
            shift_requests: List of approved shift requests
            leave_list: List of approved leaves
            existing_patterns: Weekly patterns for fixed doctors
            rules: Optional generation rules (min_rest_hours, max_night_shifts, etc.)
            
        Returns:
            Generated roster with compliance report.
        """
        # Build rules section for prompt
        rules_section = ""
        if rules:
            rules_section = f"""
GENERATION RULES:
- Minimum rest hours between shifts: {rules.get('min_rest_hours', 11)} hours
- Maximum night shifts per week: {rules.get('max_night_shifts', 4)}
- Maximum weekly hours: {rules.get('max_weekly_hours', 48)} hours
- Minimum staff per shift: {rules.get('min_staff_per_shift', 2)} doctors
- Maximum consecutive working days: {rules.get('max_consecutive_days', 6)} days
"""
        else:
            rules_section = """
GENERATION RULES (defaults):
- Minimum rest hours between shifts: 11 hours
- Maximum night shifts per week: 4
- Maximum weekly hours: 48 hours
- Minimum staff per shift: 2 doctors
- Maximum consecutive working days: 6 days
"""
        
        import time
        min_staff = rules.get('min_staff_per_shift', 2) if rules else 2
        generation_id = int(time.time() * 1000)  # Unique ID to prevent caching
        prompt = f"""Generate a complete monthly roster for {month}/{year} (Generation ID: {generation_id}).

INPUTS:
- Doctors: {json.dumps(doctors, default=str)}
- Approved Shift Requests: {json.dumps(shift_requests, default=str)}
- Leave List: {json.dumps(leave_list, default=str)}
- Weekly Patterns for Fixed Doctors: {json.dumps(existing_patterns, default=str)}
{rules_section}
SHIFT TYPES: morning (08:00-16:00), evening (16:00-00:00), night (00:00-08:00)

CRITICAL REQUIREMENTS:
1. Generate roster entries: {{"date": "YYYY-MM-DD", "doctor_id": int, "shift_type": string, "source": "auto|fixed-pattern|request"}}
2. CRITICAL: Ensure EVERY day has ALL shift types filled (morning, evening, night). No gaps allowed.
3. CRITICAL: Each shift type MUST have at least {min_staff} staff members. If a shift has fewer than {min_staff} doctors, add more doctors to meet the minimum requirement.
4. Ensure all rules are followed (especially the generation rules above)
5. Include compliance_report with any violations
6. Include balance_summary showing shift distribution

IMPORTANT: This is a fresh generation - do not reuse or cache previous roster data. Generate completely new assignments.

OUTPUT FORMAT (JSON only):
{{
  "roster": [...],
  "compliance_report": {{
    "is_compliant": boolean,
    "violations": [...],
    "balance_summary": {{...}}
  }},
  "notes": "Any generation notes"
}}"""

        return await self._call_api(prompt)
    
    async def explain_violation(
        self,
        violation: Dict[str, Any],
        context: Dict[str, Any]
    ) -> str:
        """
        Explain a roster violation in plain language.
        
        Args:
            violation: The violation details
            context: Additional context (doctor info, etc.)
            
        Returns:
            Human-readable explanation.
        """
        prompt = f"""Explain this roster violation to a doctor in a friendly, helpful way:

VIOLATION: {json.dumps(violation)}
CONTEXT: {json.dumps(context, default=str)}

Provide:
1. What the violation is
2. Why it's a problem
3. What can be done to fix it

Keep the response concise and friendly."""

        result = await self._call_api(prompt, expect_json=False)
        return result.get("text", str(result))
    
    async def suggest_optimization(
        self,
        current_roster: List[Dict[str, Any]],
        violations: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Suggest optimizations for a roster with violations.
        
        Args:
            current_roster: Current roster entries
            violations: List of violations to fix
            
        Returns:
            Suggested changes to fix violations.
        """
        prompt = f"""Analyze this roster and suggest fixes for the violations:

CURRENT ROSTER: {json.dumps(current_roster, default=str)}
VIOLATIONS: {json.dumps(violations)}

Suggest specific changes to fix each violation. Output as JSON:
{{
  "fixes": [
    {{
      "violation_index": int,
      "action": "swap|reassign|remove",
      "original": {{"date": "...", "doctor_id": ..., "shift_type": "..."}},
      "replacement": {{"date": "...", "doctor_id": ..., "shift_type": "..."}},
      "reason": "..."
    }}
  ],
  "summary": "Overall optimization summary"
}}"""

        return await self._call_api(prompt)
    
    async def chat(self, message: str, context: Optional[Dict[str, Any]] = None) -> str:
        """
        General chat for roster-related questions.
        
        Args:
            message: User's question
            context: Optional context (user info, current roster, etc.)
            
        Returns:
            AI response.
        """
        context_str = f"\nCONTEXT: {json.dumps(context, default=str)}" if context else ""
        prompt = f"""USER QUESTION: {message}{context_str}

Provide a helpful response about hospital rostering, shifts, leave, or swaps."""

        result = await self._call_api(prompt, expect_json=False)
        return result.get("text", str(result))
    
    async def _call_api(
        self,
        prompt: str,
        expect_json: bool = True
    ) -> Dict[str, Any]:
        """
        Make an API call to Claude.
        
        Args:
            prompt: The prompt to send
            expect_json: Whether to parse response as JSON
            
        Returns:
            API response.
        """
        if not self.api_key:
            # Return mock response for development
            return self._mock_response(prompt, expect_json)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/v1/messages",
                    headers={
                        "x-api-key": self.api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json"
                    },
                    json={
                        "model": "claude-3-sonnet-20240229",
                        "max_tokens": self.max_tokens,
                        "temperature": self.temperature,
                        "system": self.SYSTEM_PROMPT,
                        "messages": [
                            {"role": "user", "content": prompt}
                        ]
                    },
                    timeout=60.0
                )
                
                response.raise_for_status()
                result = response.json()
                
                content = result.get("content", [{}])[0].get("text", "")
                
                if expect_json:
                    # Try to extract JSON from response
                    try:
                        # Find JSON in response
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
        """Generate mock response for development without API key."""
        if "Generate a complete monthly roster" in prompt:
            return {
                "roster": [],
                "compliance_report": {
                    "is_compliant": True,
                    "violations": [],
                    "balance_summary": {"message": "Mock response - configure CLAUDE_API_KEY for real AI"}
                },
                "notes": "Mock roster generated - configure API key for real AI generation"
            }
        elif expect_json:
            return {"text": "Mock AI response", "mock": True}
        else:
            return {"text": "This is a mock AI response. Configure CLAUDE_API_KEY in .env for real AI features."}



