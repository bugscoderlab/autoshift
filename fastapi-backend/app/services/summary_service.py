"""
Medical Summary Service - Generates structured medical summaries from transcripts using AI.
"""

from typing import Dict, Optional
from ..config import get_settings
from ..ai.claude_client import ClaudeClient

settings = get_settings()


class MedicalSummaryService:
    """Service for generating structured medical summaries from transcripts."""
    
    def __init__(self):
        self.claude_client = ClaudeClient()
    
    async def generate_summary(self, transcript: str, doctor_name: Optional[str] = None) -> Dict[str, Optional[str]]:
        """
        Generate structured medical summary from transcript using Claude AI.
        
        Args:
            transcript: The conversation transcript text
            doctor_name: Optional doctor name for context
            
        Returns:
            Dictionary with structured summary fields:
            {
                "chief_complaint": str,
                "history_of_present_illness": str,
                "physical_examination": str,
                "assessment": str,
                "plan": str,
                "follow_up_instructions": str
            }
        """
        
        prompt = self._build_summary_prompt(transcript, doctor_name)
        
        try:
            # Use Claude's _call_api method with custom temperature
            # Temporarily override temperature for medical summaries
            original_temp = self.claude_client.temperature
            self.claude_client.temperature = 0.3  # Lower temperature for medical summaries
            
            response = await self.claude_client._call_api(prompt, expect_json=False)
            
            # Restore original temperature
            self.claude_client.temperature = original_temp
            
            # Parse the response
            summary_text = response.get("text", str(response))
            return self._parse_summary_response(summary_text)
            
        except Exception as e:
            raise Exception(f"Summary generation failed: {str(e)}")
    
    def _build_summary_prompt(self, transcript: str, doctor_name: Optional[str] = None) -> str:
        """Build the prompt for AI summary generation."""
        
        doctor_context = f"Doctor: {doctor_name}\n" if doctor_name else ""
        
        prompt = f"""You are an expert medical documentation assistant. Your task is to convert a doctor-patient consultation transcript into a structured medical summary following standard SOAP note format.

{doctor_context}
**CONVERSATION TRANSCRIPT:**
{transcript}

**INSTRUCTIONS:**
Extract and organize the information from the conversation into the following structured format. Be precise, professional, and maintain medical accuracy. If information is not mentioned in the transcript, leave that section empty (null).

**OUTPUT FORMAT (JSON):**
{{
  "chief_complaint": "Brief statement of why the patient is seeking care (1-2 sentences)",
  "history_of_present_illness": "Detailed chronological account of the current problem, including onset, duration, severity, associated symptoms, and any relevant factors",
  "physical_examination": "Objective findings from physical examination, including vital signs, general appearance, and system-specific findings",
  "assessment": "Clinical diagnosis or differential diagnoses based on the findings",
  "plan": "Treatment plan including medications prescribed, procedures ordered, referrals, and any interventions",
  "follow_up_instructions": "Specific instructions for patient follow-up, including when to return, what to watch for, and any lifestyle modifications"
}}

**IMPORTANT GUIDELINES:**
1. Use medical terminology appropriately
2. Be concise but comprehensive
3. Only include information explicitly mentioned in the transcript
4. Maintain patient confidentiality and professionalism
5. If the transcript is unclear or incomplete, note that in the relevant section
6. Format medications with dosages if mentioned
7. Include specific dates/times for follow-up if mentioned

**EXAMPLE OUTPUT:**
{{
  "chief_complaint": "45-year-old male presents with 3-day history of persistent cough and chest discomfort",
  "history_of_present_illness": "Patient reports onset of dry cough 3 days ago, initially mild but progressively worsening. Associated with mild chest tightness, worse in the evenings. No fever, no shortness of breath. Denies recent travel or sick contacts. Tried over-the-counter cough suppressants without relief.",
  "physical_examination": "Vital signs: BP 128/82, HR 78, RR 16, Temp 98.6°F, O2 Sat 98% on room air. General appearance: Well-appearing, comfortable. Respiratory: Clear to auscultation bilaterally, no wheezes or rales. Cardiovascular: Regular rate and rhythm, no murmurs.",
  "assessment": "Acute bronchitis, likely viral etiology",
  "plan": "1. Symptomatic management with guaifenesin 600mg twice daily for 7 days. 2. Increase fluid intake. 3. Rest as needed. 4. Return if symptoms worsen or persist beyond 10 days.",
  "follow_up_instructions": "Follow-up in 7-10 days if symptoms persist. Return immediately if experiencing difficulty breathing, high fever (>101°F), or chest pain."
}}

Now, analyze the provided transcript and generate the structured summary in JSON format:"""
        
        return prompt
    
    def _parse_summary_response(self, response_text: str) -> Dict[str, Optional[str]]:
        """Parse AI response into structured summary fields."""
        
        import json
        import re
        
        # Try to extract JSON from the response
        # Look for JSON object in the response
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        
        if json_match:
            try:
                json_str = json_match.group(0)
                summary = json.loads(json_str)
                
                # Ensure all fields are present
                return {
                    "chief_complaint": summary.get("chief_complaint"),
                    "history_of_present_illness": summary.get("history_of_present_illness"),
                    "physical_examination": summary.get("physical_examination"),
                    "assessment": summary.get("assessment"),
                    "plan": summary.get("plan"),
                    "follow_up_instructions": summary.get("follow_up_instructions")
                }
            except json.JSONDecodeError:
                pass
        
        # Fallback: Try to parse sections manually if JSON parsing fails
        # This is a simple fallback - in production, you might want more robust parsing
        return {
            "chief_complaint": self._extract_section(response_text, "chief_complaint", "Chief Complaint"),
            "history_of_present_illness": self._extract_section(response_text, "history_of_present_illness", "History of Present Illness"),
            "physical_examination": self._extract_section(response_text, "physical_examination", "Physical Examination"),
            "assessment": self._extract_section(response_text, "assessment", "Assessment"),
            "plan": self._extract_section(response_text, "plan", "Plan"),
            "follow_up_instructions": self._extract_section(response_text, "follow_up_instructions", "Follow-up Instructions")
        }
    
    def _extract_section(self, text: str, key: str, label: str) -> Optional[str]:
        """Extract a section from text by label."""
        import re
        
        # Try multiple patterns
        patterns = [
            rf'"{key}":\s*"([^"]+)"',
            rf'"{key}":\s*([^,}}]+)',
            rf'{label}[:]\s*([^\n]+)',
            rf'{label}[:]\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\w+[:]|\n{{|$)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                result = match.group(1).strip()
                # Clean up JSON escaping
                result = result.replace('\\n', '\n').replace('\\"', '"')
                return result if result else None
        
        return None

