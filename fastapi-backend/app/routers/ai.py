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
    rules: Dict[str, Any]


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
    Generate a complete monthly roster using Claude AI.
    """
    from datetime import date
    from calendar import monthrange
    from ..models.leave import Leave, LeaveStatus
    from ..models.shift_request import ShiftRequest, ShiftRequestStatus
    from ..models.weekly_pattern import WeeklyFixedPattern
    
    # Get all active doctors
    doctor_result = session.execute(select(Doctor).where(Doctor.active == True))
    doctors = doctor_result.scalars().all()
    
    doctors_list = [
        {
            "doctor_id": d.doctor_id,
            "name": d.name,
            "category": d.category,
            "department": d.department,
            "fte": d.fte,
            "weekly_fixed_pattern_id": d.weekly_fixed_pattern_id
        }
        for d in doctors
    ]
    
    # Get approved leave for the month
    start = date(request.year, request.month, 1)
    end = date(request.year, request.month, monthrange(request.year, request.month)[1])
    
    leave_result = session.execute(
        select(Leave)
        .where(Leave.status == "approved")
        .where(Leave.start_date <= end)
        .where(Leave.end_date >= start)
    )
    leaves = leave_result.scalars().all()
    
    leave_list = [
        {
            "doctor_id": l.doctor_id,
            "start_date": str(l.start_date),
            "end_date": str(l.end_date),
            "leave_type": l.leave_type
        }
        for l in leaves
    ]
    
    # Get approved shift requests
    shift_request_result = session.execute(
        select(ShiftRequest)
        .where(ShiftRequest.status == "approved")
        .where(ShiftRequest.date >= start)
        .where(ShiftRequest.date <= end)
    )
    shift_requests = shift_request_result.scalars().all()
    
    shift_requests_list = [
        {
            "doctor_id": sr.doctor_id,
            "shift_date": str(sr.date),
            "shift_type": sr.shift_type
        }
        for sr in shift_requests
    ]
    
    # Get weekly patterns
    pattern_result = session.execute(select(WeeklyFixedPattern))
    patterns = pattern_result.scalars().all()
    
    patterns_dict = {
        p.pattern_id: {
            "pattern_name": p.pattern_name,
            "week_number": p.week_number,
            "day_1": p.day_1,
            "day_2": p.day_2,
            "day_3": p.day_3,
            "day_4": p.day_4,
            "day_5": p.day_5,
            "day_6": p.day_6,
            "day_7": p.day_7
        }
        for p in patterns
    }
    
    # Generate roster using Claude
    claude = ClaudeClient()
    result = await claude.generate_roster(
        year=request.year,
        month=request.month,
        doctors=doctors_list,
        shift_requests=shift_requests_list,
        leave_list=leave_list,
        existing_patterns=patterns_dict
    )
    
    return {
        "year": request.year,
        "month": request.month,
        "roster": result.get("roster", []),
        "compliance_report": result.get("compliance_report", {}),
        "balance_summary": result.get("balance_summary", {})
    }
