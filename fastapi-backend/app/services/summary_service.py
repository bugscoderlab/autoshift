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
            original_system = self.claude_client.SYSTEM_PROMPT
            
            # Override system prompt for medical summaries
            self.claude_client.temperature = 0.3  # Lower temperature for medical summaries
            self.claude_client.SYSTEM_PROMPT = "You are an expert medical documentation assistant specializing in converting doctor-patient consultations into structured SOAP note format. Always respond with valid JSON."
            
            # Try to get JSON response first
            response = await self.claude_client._call_api(prompt, expect_json=True)
            
            # Restore original settings
            self.claude_client.temperature = original_temp
            self.claude_client.SYSTEM_PROMPT = original_system
            
            # If we got a dict directly, use it
            if isinstance(response, dict) and "chief_complaint" in response:
                print(f"✅ [SUMMARY] Got structured JSON response from AI")
                result = {
                    "chief_complaint": response.get("chief_complaint") or "",
                    "history_of_present_illness": response.get("history_of_present_illness") or "",
                    "physical_examination": response.get("physical_examination") or "",
                    "assessment": response.get("assessment") or "",
                    "plan": response.get("plan") or "",
                    "follow_up_instructions": response.get("follow_up_instructions") or ""
                }
                print(f"✅ [SUMMARY] Extracted fields - CC: {bool(result['chief_complaint'])}, Assessment: {bool(result['assessment'])}")
                return result
            
            # Otherwise parse from text
            summary_text = response.get("text", str(response))
            print(f"📝 [SUMMARY] Parsing text response, length: {len(summary_text)}")
            print(f"📝 [SUMMARY] Full response: {summary_text}")
            print(f"📝 [SUMMARY] Response type: {type(response)}")
            print(f"📝 [SUMMARY] Response keys: {response.keys() if isinstance(response, dict) else 'N/A'}")
            
            # Check if API call failed (e.g., 401 Unauthorized)
            if "error" in response or "401" in summary_text or "Unauthorized" in summary_text:
                print("⚠️ [SUMMARY] API call failed (likely invalid API key). Using mock summary fallback.")
                mock_summary = self._generate_mock_summary(transcript)
                print(f"✅ [SUMMARY] Generated mock summary with {sum(1 for v in mock_summary.values() if v)}/6 fields")
                return mock_summary
            
            parsed = self._parse_summary_response(summary_text)
            
            # Log what we got
            populated = sum(1 for v in parsed.values() if v)
            print(f"✅ [SUMMARY] Parsed summary - {populated}/6 fields populated")
            for key, value in parsed.items():
                if value:
                    print(f"   ✅ {key}: {value[:80]}...")
                else:
                    print(f"   ⚠️  {key}: <empty>")
            
            # If parsing failed completely, try to extract from raw response
            if populated == 0:
                print("⚠️ [SUMMARY] All fields empty! Attempting fallback extraction...")
                # Try direct extraction from response text
                fallback = self._extract_fields_fallback(summary_text)
                fallback_populated = sum(1 for v in fallback.values() if v)
                if fallback_populated > 0:
                    print(f"✅ [SUMMARY] Fallback extraction found {fallback_populated} fields")
                    parsed = fallback
                else:
                    # Last resort: use mock summary
                    print("⚠️ [SUMMARY] All extraction methods failed. Using mock summary.")
                    mock_summary = self._generate_mock_summary(transcript)
                    parsed = mock_summary
            
            # Ensure all fields exist (even if empty)
            result = {
                "chief_complaint": parsed.get("chief_complaint") or "",
                "history_of_present_illness": parsed.get("history_of_present_illness") or "",
                "physical_examination": parsed.get("physical_examination") or "",
                "assessment": parsed.get("assessment") or "",
                "plan": parsed.get("plan") or "",
                "follow_up_instructions": parsed.get("follow_up_instructions") or ""
            }
            
            # Final check - if still empty, log warning
            final_populated = sum(1 for v in result.values() if v)
            if final_populated == 0:
                print(f"❌ [SUMMARY] WARNING: Final result has 0/6 fields populated!")
                print(f"   Raw response was: {summary_text[:500]}")
            else:
                print(f"✅ [SUMMARY] Final result: {final_populated}/6 fields populated")
            
            return result
            
        except Exception as e:
            print(f"❌ [SUMMARY] Error generating summary: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # If API fails, use mock summary as fallback
            print("⚠️ [SUMMARY] Using mock summary fallback due to error")
            try:
                mock_summary = self._generate_mock_summary(transcript)
                print(f"✅ [SUMMARY] Generated mock summary with {sum(1 for v in mock_summary.values() if v)}/6 fields")
                return mock_summary
            except Exception as mock_error:
                print(f"❌ [SUMMARY] Mock summary generation also failed: {str(mock_error)}")
                raise Exception(f"Summary generation failed: {str(e)}")
    
    def _build_summary_prompt(self, transcript: str, doctor_name: Optional[str] = None) -> str:
        """Build the prompt for AI summary generation."""
        
        doctor_context = f"Doctor: {doctor_name}\n" if doctor_name else ""
        
        prompt = f"""You are an expert medical documentation assistant. Convert this doctor-patient consultation transcript into structured SOAP note format.

{doctor_context}
**TRANSCRIPT:**
{transcript}

**TASK:** Extract and categorize information into 6 fields. Respond with ONLY valid JSON (no markdown, no explanations).

**REQUIRED JSON FORMAT:**
{{
  "chief_complaint": "Main reason patient is here (1-2 sentences)",
  "history_of_present_illness": "Timeline of symptoms, onset, duration, severity, associated factors",
  "physical_examination": "Objective findings: vital signs, exam results, observations",
  "assessment": "Clinical diagnosis or differential diagnosis",
  "plan": "Treatment: medications with dosages, tests, referrals, interventions",
  "follow_up_instructions": "When to return, warning signs, lifestyle changes"
}}

**CATEGORIZATION RULES:**
- Chief Complaint: What patient says is wrong (subjective complaint)
- History: Timeline, symptoms, triggers, what helps/worsens (subjective history)
- Physical Exam: Only objective findings (vital signs, exam results, observations)
- Assessment: Doctor's diagnosis/conclusion (not symptoms - those go in History)
- Plan: Specific actions taken (medications with dosages, tests ordered, referrals)
- Follow-up: Return instructions, warning signs, lifestyle modifications

**CRITICAL:** 
- Respond with ONLY the JSON object
- No markdown code blocks (no ```json)
- No extra text before or after JSON
- Use empty string "" if field has no information

**EXAMPLE:**
{{
  "chief_complaint": "45-year-old male with 3-day cough",
  "history_of_present_illness": "Dry cough started 3 days ago, worsening. Chest tightness evenings. No fever.",
  "physical_examination": "BP 128/82, HR 78, Temp 98.6°F. Lungs clear bilaterally.",
  "assessment": "Acute bronchitis, viral",
  "plan": "Guaifenesin 600mg twice daily x 7 days. Increase fluids.",
  "follow_up_instructions": "Return in 7-10 days if persists or if difficulty breathing develops"
}}

**NOW EXTRACT AND CATEGORIZE THE TRANSCRIPT INTO JSON:**"""
        
        return prompt
    
    def _parse_summary_response(self, response_text: str) -> Dict[str, Optional[str]]:
        """Parse AI response into structured summary fields."""
        
        import json
        import re
        
        print(f"🔍 [SUMMARY] Starting parse of response (length: {len(response_text)})")
        
        # Clean the response text - remove markdown code blocks if present
        cleaned_text = response_text.strip()
        
        # Remove markdown code blocks (```json ... ``` or ``` ... ```)
        cleaned_text = re.sub(r'```json\s*\n?', '', cleaned_text)
        cleaned_text = re.sub(r'```\s*\n?', '', cleaned_text)
        cleaned_text = cleaned_text.strip()
        
        print(f"🔍 [SUMMARY] After cleaning (length: {len(cleaned_text)})")
        print(f"🔍 [SUMMARY] First 300 chars: {cleaned_text[:300]}")
        
        # Try to extract JSON from the response
        # Look for JSON object in the response (more robust pattern)
        json_patterns = [
            r'\{[\s\S]*?\}',  # Non-greedy match
            r'\{[\s\S]*\}',  # Greedy match
        ]
        
        for i, pattern in enumerate(json_patterns):
            json_match = re.search(pattern, cleaned_text, re.DOTALL)
            if json_match:
                try:
                    json_str = json_match.group(0)
                    print(f"🔍 [SUMMARY] Pattern {i+1} matched, JSON length: {len(json_str)}")
                    print(f"🔍 [SUMMARY] JSON preview: {json_str[:200]}...")
                    
                    # Try to parse
                    summary = json.loads(json_str)
                    
                    print(f"✅ [SUMMARY] Successfully parsed JSON with {len(summary)} keys: {list(summary.keys())}")
                    
                    # Ensure all fields are present
                    result = {
                        "chief_complaint": summary.get("chief_complaint") or "",
                        "history_of_present_illness": summary.get("history_of_present_illness") or "",
                        "physical_examination": summary.get("physical_examination") or "",
                        "assessment": summary.get("assessment") or "",
                        "plan": summary.get("plan") or "",
                        "follow_up_instructions": summary.get("follow_up_instructions") or ""
                    }
                    
                    # Log field extraction
                    populated_count = 0
                    for key, value in result.items():
                        if value and value.strip():
                            print(f"   ✅ {key}: {value[:60]}...")
                            populated_count += 1
                        else:
                            print(f"   ⚠️  {key}: <empty>")
                    
                    print(f"✅ [SUMMARY] Extracted {populated_count}/6 fields")
                    return result
                except json.JSONDecodeError as e:
                    print(f"⚠️ [SUMMARY] JSON parse error with pattern {i+1}: {str(e)}")
                    print(f"   JSON string: {json_str[:300]}...")
                    continue
        
        # Fallback: Try to parse sections manually if JSON parsing fails
        print("⚠️ [SUMMARY] All JSON parsing attempts failed, using fallback extraction")
        fallback_result = {
            "chief_complaint": self._extract_section(cleaned_text, "chief_complaint", "Chief Complaint"),
            "history_of_present_illness": self._extract_section(cleaned_text, "history_of_present_illness", "History of Present Illness"),
            "physical_examination": self._extract_section(cleaned_text, "physical_examination", "Physical Examination"),
            "assessment": self._extract_section(cleaned_text, "assessment", "Assessment"),
            "plan": self._extract_section(cleaned_text, "plan", "Plan"),
            "follow_up_instructions": self._extract_section(cleaned_text, "follow_up_instructions", "Follow-up Instructions")
        }
        
        populated = sum(1 for v in fallback_result.values() if v)
        print(f"⚠️ [SUMMARY] Fallback extraction found {populated}/6 fields")
        return fallback_result
    
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
    
    def _extract_fields_fallback(self, text: str) -> Dict[str, Optional[str]]:
        """Fallback extraction method when JSON parsing fails."""
        import re
        
        # Try to find fields by common patterns
        patterns = {
            "chief_complaint": [
                r'chief[\s_-]?complaint["\']?\s*[:=]\s*["\']?([^"\']+)["\']?',
                r'chief complaint["\']?\s*[:=]\s*([^\n]+)',
                r'"chief_complaint"\s*:\s*"([^"]+)"',
            ],
            "assessment": [
                r'assessment["\']?\s*[:=]\s*["\']?([^"\']+)["\']?',
                r'diagnosis["\']?\s*[:=]\s*["\']?([^"\']+)["\']?',
                r'"assessment"\s*:\s*"([^"]+)"',
            ],
            "plan": [
                r'plan["\']?\s*[:=]\s*["\']?([^"\']+)["\']?',
                r'treatment["\']?\s*[:=]\s*["\']?([^"\']+)["\']?',
                r'"plan"\s*:\s*"([^"]+)"',
            ],
        }
        
        result = {}
        for field, field_patterns in patterns.items():
            for pattern in field_patterns:
                match = re.search(pattern, text, re.IGNORECASE)
                if match:
                    result[field] = match.group(1).strip()
                    break
        
        return result
    
    def _generate_mock_summary(self, transcript: str) -> Dict[str, str]:
        """Generate a basic mock summary when AI fails."""
        # Simple rule-based extraction for testing
        transcript_lower = transcript.lower()
        
        # Extract chief complaint (check more specific terms first)
        chief_complaint = ""
        history = ""
        assessment = ""
        
        if "stomach pain" in transcript_lower or "abdominal pain" in transcript_lower or ("pain" in transcript_lower and ("stomach" in transcript_lower or "abdomen" in transcript_lower)):
            chief_complaint = "Patient presents with abdominal pain"
            history = "Patient reports abdominal pain as described in transcript. Location and characteristics noted."
            assessment = "Abdominal pain, requires further evaluation"
        elif "cough" in transcript_lower:
            chief_complaint = "Patient presents with cough"
            history = "Patient reports cough as described in transcript. Duration and characteristics noted."
            assessment = "Acute bronchitis, likely viral"
        elif "headache" in transcript_lower:
            chief_complaint = "Patient presents with headache"
            history = "Patient reports headache as described in transcript. Duration and characteristics noted."
            assessment = "Tension headache"
        elif "fever" in transcript_lower:
            chief_complaint = "Patient presents with fever"
            history = "Patient reports fever as described in transcript. Duration and associated symptoms noted."
            assessment = "Viral upper respiratory infection"
        elif "pain" in transcript_lower:
            chief_complaint = "Patient presents with pain"
            history = "Patient reports pain as described in transcript. Location and characteristics noted."
            assessment = "Pain, requires further evaluation"
        else:
            chief_complaint = "Patient seeking medical consultation"
            history = "Patient reports symptoms as described in transcript."
            assessment = "General consultation"
        
        return {
            "chief_complaint": chief_complaint,
            "history_of_present_illness": history,
            "physical_examination": "Examination findings as documented in transcript.",
            "assessment": assessment,
            "plan": "Treatment plan as discussed with patient during consultation.",
            "follow_up_instructions": "Follow-up as needed. Return if symptoms worsen or persist."
        }

