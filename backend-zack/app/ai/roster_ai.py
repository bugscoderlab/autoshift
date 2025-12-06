"""AI-assisted roster generation."""

from typing import List, Dict, Any, Optional
from datetime import date
from app.models.doctor import Doctor
from app.models.roster import MonthlyRoster
from app.models.pattern import ShiftType
from app.ai.clients import get_ai_client


def generate_ai_roster_suggestions(
    doctors: List[Doctor],
    year: int,
    month: int,
    existing_roster: List[MonthlyRoster],
    constraints: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Use AI to suggest roster assignments for flexible doctors.
    
    Args:
        doctors: List of flexible doctors
        year: Year
        month: Month
        existing_roster: Existing roster entries
        constraints: Additional constraints (leave, requests, etc.)
        
    Returns:
        List of suggested assignments (dict with doctor_id, date, shift_type)
    """
    print("[AI Roster] Requesting AI roster suggestions...")
    client = get_ai_client(use_fast=False)  # Use Claude for complex reasoning
    
    if not client:
        print("[AI Roster] No AI client available, skipping AI suggestions")
        return []
    
    print(f"[AI Roster] Using AI service: {type(client).__name__}")
    
    # Build context for AI
    context = {
        "year": year,
        "month": month,
        "doctors": [
            {
                "id": d.doctor_id,
                "name": d.name,
                "fte": d.fte,
                "join_date": str(d.join_date),
                "leave_date": str(d.leave_date) if d.leave_date else None
            }
            for d in doctors
        ],
        "existing_assignments": len(existing_roster),
        "constraints": constraints
    }
    
    prompt = f"""
You are an expert hospital roster scheduler. Generate optimal shift assignments for flexible doctors.

Context:
- Year: {year}, Month: {month}
- Doctors: {len(doctors)} flexible doctors
- Existing assignments: {len(existing_roster)} entries
- Constraints: {constraints}

Requirements:
1. Balance workload across Resus, EDx, and AUC shifts
2. Ensure 11-hour rest between shifts
3. Respect approved leave and shift requests
4. Consider FTE (Full-Time Equivalent) for each doctor

Generate a JSON list of suggested assignments in this format:
[
  {{"doctor_id": 1, "date": "2024-01-15", "shift_type": "Resus"}},
  {{"doctor_id": 2, "date": "2024-01-15", "shift_type": "EDx"}},
  ...
]

Only suggest assignments that:
- Are for flexible doctors
- Don't conflict with existing roster
- Respect leave dates
- Follow rest rules
- Balance workload

Return only valid JSON, no additional text.
"""
    
    try:
        print("[AI Roster] Sending request to AI service...")
        response = client.generate(prompt)
        print("[AI Roster] Received response from AI service")
        # Parse JSON response (simplified - in production, add proper parsing)
        # For now, return empty list as placeholder
        # TODO: Implement JSON parsing from AI response
        return []
    except Exception as e:
        error_msg = str(e)
        print(f"[AI Roster] ERROR: AI roster generation failed")
        print(f"[AI Roster] Error details: {error_msg}")
        
        # Check if it's an authentication error
        if "401" in error_msg or "authentication" in error_msg.lower() or "api-key" in error_msg.lower():
            service_name = "Claude" if isinstance(client, type(client)) else "Groq"
            print(f"[AI Roster] Authentication error detected for {service_name}")
            print(f"[AI Roster] Please check your API key in .env file")
            if "claude" in error_msg.lower():
                print("[AI Roster] Check CLAUDE_API_KEY in .env")
            elif "groq" in error_msg.lower() or "x-api-key" in error_msg.lower():
                print("[AI Roster] Check GROQ_API_KEY in .env")
        
        return []


def optimize_shift_balancing(
    roster_entries: List[MonthlyRoster],
    target_distribution: Dict[ShiftType, float]
) -> List[Dict[str, Any]]:
    """
    Use AI to optimize shift balancing.
    
    Args:
        roster_entries: Current roster entries
        target_distribution: Target distribution percentages
        
    Returns:
        List of optimization suggestions
    """
    print("[AI Optimization] Requesting AI optimization suggestions...")
    client = get_ai_client(use_fast=True)  # Use Groq for fast inference
    
    if not client:
        print("[AI Optimization] No AI client available, skipping AI optimization")
        return []
    
    print(f"[AI Optimization] Using AI service: {type(client).__name__}")
    
    prompt = f"""
Analyze this roster and suggest optimizations for better workload balancing.

Current roster has {len(roster_entries)} entries.
Target distribution: {target_distribution}

Suggest specific swaps or reassignments to improve balance.
Return JSON format:
[
  {{"action": "swap", "from_doctor": 1, "to_doctor": 2, "date": "2024-01-15", "reason": "..."}},
  ...
]
"""
    
    try:
        response = client.generate(prompt)
        # TODO: Parse and return optimization suggestions
        return []
    except Exception as e:
        print(f"AI optimization failed: {e}")
        return []

