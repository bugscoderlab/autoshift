"""
AI assistance endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional, Dict, Any
from pydantic import BaseModel

from ..database import get_session
from ..models.doctor import Doctor
from ..models.roster import MonthlyRoster
from ..ai.claude_client import ClaudeClient
from ..ai.groq_client import GroqClient
from ..rules.compliance import ComplianceChecker

router = APIRouter(prefix="/ai", tags=["AI"])

# Valid shift types (after migration)
VALID_SHIFT_TYPES = {"morning", "afternoon", "evening", "night"}


class ExplainRequest(BaseModel):
    """Request body for violation explanation."""
    violations: List[Dict[str, Any]]
    doctor_id: Optional[int] = None


class ChatRequest(BaseModel):
    """Request body for AI chat."""
    message: str
    doctor_id: Optional[int] = None
    context: Optional[Dict[str, Any]] = None


class OptimizeRequest(BaseModel):
    """Request body for roster optimization."""
    year: int
    month: int


class GenerateRosterRequest(BaseModel):
    """Request body for roster generation."""
    year: int
    month: int
    use_ai: bool = True
    rules: Optional[Dict[str, Any]] = None


@router.post("/explain")
async def explain_violations(
    request: ExplainRequest,
    session: Session = Depends(get_session)
):
    """
    Get AI explanations for roster violations.
    """
    # Get doctor context if specified
    doctors_dict = {}
    if request.doctor_id:
        doctor = session.get(Doctor, request.doctor_id)
        if doctor:
            doctors_dict[doctor.doctor_id] = {
                "name": doctor.name,
                "category": doctor.category,
                "department": doctor.department
            }
    else:
        # Get all doctors for context
        result = session.execute(select(Doctor))
        doctors = result.scalars().all()
        doctors_dict = {
            d.doctor_id: {
                "name": d.name,
                "category": d.category,
                "department": d.department
            }
            for d in doctors
        }
    
    claude = ClaudeClient()
    explained = []
    
    for violation in request.violations:
        doctor_id = violation.get("doctor_id")
        doctor_info = doctors_dict.get(doctor_id, {})
        
        explanation = await claude.explain_violation(
            violation=violation,
            context={"doctor": doctor_info}
        )
        
        explained.append({
            **violation,
            "explanation": explanation
        })
    
    return {"violations": explained}


@router.post("/chat")
async def chat_with_ai(
    request: ChatRequest,
    session: Session = Depends(get_session)
):
    """
    Chat with AI assistant about roster-related questions.
    """
    context = request.context or {}
    
    # Add doctor context if specified
    if request.doctor_id:
        doctor = session.get(Doctor, request.doctor_id)
        if doctor:
            context["doctor"] = {
                "name": doctor.name,
                "category": doctor.category,
                "department": doctor.department
            }
            
            # Get doctor's upcoming shifts
            from datetime import date
            result = session.execute(
                select(MonthlyRoster)
                .where(MonthlyRoster.doctor_id == request.doctor_id)
                .where(MonthlyRoster.date >= date.today())
                .order_by(MonthlyRoster.date)
                .limit(5)
            )
            upcoming_shifts = result.scalars().all()
            
            context["upcoming_shifts"] = [
                {
                    "date": str(s.date),
                    "shift_type": s.shift_type
                }
                for s in upcoming_shifts
            ]
    
    claude = ClaudeClient()
    response = await claude.chat(request.message, context)
    
    return {
        "message": request.message,
        "response": response
    }


@router.post("/optimize")
async def optimize_roster(
    request: OptimizeRequest,
    session: Session = Depends(get_session)
):
    """
    Get AI suggestions for optimizing a roster.
    """
    from datetime import date
    from calendar import monthrange
    
    start = date(request.year, request.month, 1)
    end = date(request.year, request.month, monthrange(request.year, request.month)[1])
    
    # Get current roster
    result = session.execute(
        select(MonthlyRoster)
        .where(MonthlyRoster.date >= start)
        .where(MonthlyRoster.date <= end)
    )
    roster = result.scalars().all()
    
    roster_list = [
        {
            "roster_id": r.roster_id,
            "date": str(r.date),
            "doctor_id": r.doctor_id,
            "shift_type": r.shift_type
        }
        for r in roster
    ]
    
    # Get doctors
    doctor_result = session.execute(select(Doctor).where(Doctor.active == True))
    doctors = doctor_result.scalars().all()
    doctors_dict = {
        d.doctor_id: {
            "name": d.name,
            "category": d.category
        }
        for d in doctors
    }
    
    # Check compliance
    checker = ComplianceChecker()
    compliance = checker.check_roster_compliance(
        [{"date": r.date, "doctor_id": r.doctor_id, "shift_type": r.shift_type} for r in roster],
        doctors_dict
    )
    
    # Get AI suggestions
    claude = ClaudeClient()
    suggestions = await claude.suggest_optimization(roster_list, compliance.get("violations", []))
    
    return {
        "year": request.year,
        "month": request.month,
        "current_violations": compliance.get("total_violations", 0),
        "suggestions": suggestions
    }


@router.get("/quick-answer")
async def quick_answer(
    question: str
):
    """
    Get a quick answer to a simple roster question using Groq.
    """
    groq = GroqClient()
    answer = await groq.quick_answer(question)
    
    return {
        "question": question,
        "answer": answer
    }


@router.post("/validate-shift")
async def validate_shift(
    doctor_id: int,
    shift_date: str,
    shift_type: str,
    session: Session = Depends(get_session)
):
    """
    Quickly validate if a shift can be assigned to a doctor.
    """
    from datetime import date, timedelta
    
    target_date = date.fromisoformat(shift_date)
    
    # Get doctor's existing shifts around the target date
    start = target_date - timedelta(days=2)
    end = target_date + timedelta(days=2)
    
    result = session.execute(
        select(MonthlyRoster)
        .where(MonthlyRoster.doctor_id == doctor_id)
        .where(MonthlyRoster.date >= start)
        .where(MonthlyRoster.date <= end)
    )
    existing_shifts = result.scalars().all()
    
    shifts_list = [
        {
            "date": str(s.date),
            "shift_type": s.shift_type
        }
        for s in existing_shifts
    ]
    
    proposed = {
        "date": shift_date,
        "shift_type": shift_type
    }
    
    groq = GroqClient()
    result = await groq.quick_validate(proposed, shifts_list)
    
    return result


@router.post("/generate-roster")
async def generate_roster(
    request: GenerateRosterRequest,
    session: Session = Depends(get_session)
):
    """
    Generate a complete monthly roster following backend-zack pattern.
    Uses RosterService to generate roster with fixed patterns and AI for flexible doctors.
    """
    from ..services.roster_service import RosterService
    
    try:
        # Use roster service to generate roster
        service = RosterService(session)
        roster_entries, violations, ai_used = service.generate_monthly_roster(
            request.year,
            request.month,
            use_ai=request.use_ai,
            replace_existing=True
        )
        
        # Get doctor names for response
        doctor_ids = set(entry.doctor_id for entry in roster_entries)
        doctors_dict = {}
        for doctor_id in doctor_ids:
            doctor = session.get(Doctor, doctor_id)
            if doctor:
                doctors_dict[doctor_id] = doctor.name
        
        # Convert to response format matching current /ai/generate-roster format
        # Filter to only include valid shift types
        roster_list = []
        for entry in roster_entries:
            # Only include entries with valid shift types
            if entry.shift_type.lower() in VALID_SHIFT_TYPES:
                roster_list.append({
                    "roster_id": entry.roster_id,
                    "date": str(entry.date),
                    "doctor_id": entry.doctor_id,
                    "doctor_name": doctors_dict.get(entry.doctor_id, f"Doctor {entry.doctor_id}"),
                    "shift_type": entry.shift_type,
                    "source": entry.source,
                    "start_time": entry.start_time,
                    "end_time": entry.end_time
                })
        
        # Build compliance report
        violation_messages = [v.description for v in violations]
        compliance_report = {
            "is_compliant": len(violations) == 0,
            "violations": violation_messages,
            "violation_count": len(violations)
        }
        
        # Build balance summary (simplified)
        balance_summary = {}
        for doctor_id in doctor_ids:
            doctor_entries = [e for e in roster_entries if e.doctor_id == doctor_id]
            balance_summary[doctor_id] = {
                "total_shifts": len(doctor_entries),
                "doctor_name": doctors_dict.get(doctor_id, f"Doctor {doctor_id}")
            }
        
        return {
            "year": request.year,
            "month": request.month,
            "roster": roster_list,
            "compliance_report": compliance_report,
            "balance_summary": balance_summary,
            "ai_used": ai_used
        }
    except Exception as e:
        error_detail = str(e)
        import traceback
        print(f"Error in generate_roster: {error_detail}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=error_detail)
