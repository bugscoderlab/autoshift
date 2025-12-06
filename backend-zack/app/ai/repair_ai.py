"""AI-assisted roster repair and violation fixing."""

from typing import List, Dict, Any
from app.models.roster import MonthlyRoster
from app.schemas.roster import ViolationDetail
from app.ai.clients import get_ai_client


def suggest_repairs(
    violations: List[ViolationDetail],
    roster_entries: List[MonthlyRoster],
    context: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Use AI to suggest repairs for roster violations.
    
    Args:
        violations: List of violations to fix
        roster_entries: Current roster entries
        context: Additional context (doctors, constraints, etc.)
        
    Returns:
        List of repair suggestions (dict with action, doctor_id, date, etc.)
    """
    client = get_ai_client(use_fast=False)  # Use Claude for complex reasoning
    
    if not client:
        return []
    
    violations_summary = [
        {
            "type": v.type,
            "description": v.description,
            "doctor_id": v.doctor_id,
            "date": str(v.date) if v.date else None,
            "severity": v.severity
        }
        for v in violations
    ]
    
    prompt = f"""
You are an expert at fixing hospital roster violations. Suggest specific repairs.

Violations to fix:
{violations_summary}

Current roster: {len(roster_entries)} entries
Context: {context}

For each violation, suggest a concrete repair action:
1. Rest rule violations: Suggest shift swaps or reassignments
2. Workload balance: Suggest reassignments to balance Resus/EDx/AUC
3. Leave conflicts: Suggest alternative dates or doctors

Return JSON format:
[
  {{
    "violation_index": 0,
    "action": "swap",
    "doctor_id_from": 1,
    "doctor_id_to": 2,
    "date": "2024-01-15",
    "reason": "Fixes rest rule violation"
  }},
  {{
    "violation_index": 1,
    "action": "reassign",
    "doctor_id": 3,
    "date": "2024-01-16",
    "old_shift": "Resus",
    "new_shift": "EDx",
    "reason": "Improves workload balance"
  }},
  ...
]

Ensure all repairs:
- Maintain compliance with all rules
- Don't create new violations
- Are feasible given constraints

Return only valid JSON, no additional text.
"""
    
    try:
        response = client.generate(prompt)
        # TODO: Parse JSON response and return repair suggestions
        return []
    except Exception as e:
        print(f"AI repair suggestion failed: {e}")
        return []


def auto_repair_violations(
    violations: List[ViolationDetail],
    roster_entries: List[MonthlyRoster]
) -> List[MonthlyRoster]:
    """
    Automatically repair violations using AI guidance.
    
    Args:
        violations: List of violations
        roster_entries: Current roster entries
        
    Returns:
        Updated roster entries after repairs
    """
    # Get AI suggestions
    suggestions = suggest_repairs(violations, roster_entries, {})
    
    # Apply repairs (simplified - in production, implement full logic)
    # TODO: Implement repair application logic
    updated_roster = roster_entries.copy()
    
    return updated_roster

