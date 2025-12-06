"""AI explanation engine for roster decisions and violations."""

from typing import Optional, Dict, Any
from datetime import date
from app.models.pattern import ShiftType
from app.ai.clients import get_ai_client


def explain_violation(
    violation_type: str,
    doctor_id: Optional[int] = None,
    violation_date: Optional[date] = None,
    context: Optional[Dict[str, Any]] = None
) -> str:
    """
    Generate AI explanation for a roster violation.
    
    Args:
        violation_type: Type of violation (e.g., "rest_rule", "workload_balance")
        doctor_id: Doctor ID involved
        violation_date: Date of violation
        context: Additional context
        
    Returns:
        Human-readable explanation
    """
    print("[AI Explain] Generating explanation for violation...")
    client = get_ai_client(use_fast=False)  # Use Claude for best explanations
    
    if not client:
        return "AI explanation unavailable (AI disabled or not configured)."
    
    print(f"[AI Explain] Using AI service: {type(client).__name__}")
    
    context_str = ""
    if context:
        context_str = f"\nAdditional context: {context}"
    
    prompt = f"""
Explain why this roster violation occurred and what it means:

Violation Type: {violation_type}
Doctor ID: {doctor_id if doctor_id else "N/A"}
Date: {violation_date if violation_date else "N/A"}
{context_str}

Provide a clear, concise explanation that:
1. Explains what rule was violated
2. Why it matters (impact on doctor, patient care, etc.)
3. What could be done to fix it

Write in a professional but accessible tone for hospital administrators.
"""
    
    try:
        explanation = client.generate(prompt)
        return explanation
    except Exception as e:
        error_msg = str(e)
        print(f"[AI Explain] ERROR: {error_msg}")
        if "401" in error_msg or "authentication" in error_msg.lower():
            return f"AI explanation unavailable: Authentication error. Please check your API key configuration."
        return f"Failed to generate explanation: {error_msg}"


def explain_shift_assignment(
    doctor_id: int,
    assignment_date: date,
    shift_type: ShiftType,
    context: Optional[Dict[str, Any]] = None
) -> str:
    """
    Generate AI explanation for a shift assignment decision.
    
    Args:
        doctor_id: Doctor ID
        assignment_date: Date of assignment
        shift_type: Assigned shift type
        context: Additional context (workload, requests, etc.)
        
    Returns:
        Human-readable explanation
    """
    print("[AI Explain] Generating explanation for shift assignment...")
    client = get_ai_client(use_fast=False)
    
    if not client:
        return "AI explanation unavailable."
    
    print(f"[AI Explain] Using AI service: {type(client).__name__}")
    
    context_str = ""
    if context:
        context_str = f"\nContext: {context}"
    
    prompt = f"""
Explain why this shift assignment was made:

Doctor ID: {doctor_id}
Date: {assignment_date}
Shift Type: {shift_type}
{context_str}

Provide a clear explanation covering:
1. Why this doctor was assigned this shift
2. How it fits into workload balancing
3. Any relevant constraints (leave, requests, FTE, etc.)
4. How it maintains compliance with rules

Write in a professional tone for hospital administrators.
"""
    
    try:
        explanation = client.generate(prompt)
        return explanation
    except Exception as e:
        error_msg = str(e)
        print(f"[AI Explain] ERROR: {error_msg}")
        if "401" in error_msg or "authentication" in error_msg.lower():
            return f"AI explanation unavailable: Authentication error. Please check your API key configuration."
        return f"Failed to generate explanation: {error_msg}"

