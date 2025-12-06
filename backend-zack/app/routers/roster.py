"""Roster management endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.db.session import get_session
from app.services.roster_service import RosterService
from app.schemas.roster import (
    RosterGenerateRequest,
    RosterGenerateResponse,
    RosterRepairRequest,
    RosterRepairResponse,
    RosterListResponse,
    RosterEntry,
    ViolationDetail
)
from app.models.roster import MonthlyRoster


router = APIRouter(prefix="/roster", tags=["roster"])


@router.post("/generate", response_model=RosterGenerateResponse)
def generate_roster(
    request: RosterGenerateRequest,
    session: Session = Depends(get_session)
) -> RosterGenerateResponse:
    """
    Generate monthly roster.
    
    Generates roster for all doctors (fixed and flexible) for the specified month.
    Uses AI for complex reasoning if enabled.
    """
    service = RosterService(session)
    
    try:
        roster_entries, violations, ai_used = service.generate_monthly_roster(
            request.year,
            request.month,
            use_ai=request.use_ai
        )
        
        # Convert to response format
        entries = []
        from app.models.doctor import Doctor
        for entry in roster_entries:
            # Get doctor name
            doctor = session.get(Doctor, entry.doctor_id)
            doctor_name = doctor.name if doctor else f"Doctor {entry.doctor_id}"
            
            entries.append(
                RosterEntry(
                    roster_id=entry.roster_id,
                    date=entry.date,
                    doctor_id=entry.doctor_id,
                    doctor_name=doctor_name,
                    shift_type=entry.shift_type,
                    source=entry.source
                )
            )
        
        violation_messages = [v.description for v in violations]
        
        return RosterGenerateResponse(
            year=request.year,
            month=request.month,
            entries=entries,
            violations=violation_messages,
            ai_used=ai_used
        )
    except Exception as e:
        # Convert exception to string to avoid serialization issues with Pydantic models
        error_detail = str(e)
        import traceback
        print(f"Error in generate_roster: {error_detail}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=error_detail)


@router.post("/repair", response_model=RosterRepairResponse)
def repair_roster(
    request: RosterRepairRequest,
    session: Session = Depends(get_session)
) -> RosterRepairResponse:
    """
    Repair roster violations.
    
    Automatically fixes violations using rules and AI guidance.
    """
    service = RosterService(session)
    
    try:
        repairs_applied, remaining_violations, ai_used = service.repair_roster(
            request.year,
            request.month,
            use_ai=request.use_ai
        )
        
        violation_messages = [v.description for v in remaining_violations]
        
        return RosterRepairResponse(
            year=request.year,
            month=request.month,
            repairs_applied=repairs_applied,
            remaining_violations=violation_messages,
            ai_used=ai_used
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list", response_model=RosterListResponse)
def list_roster(
    year: int,
    month: int,
    session: Session = Depends(get_session)
) -> RosterListResponse:
    """
    Get roster entries for a specific month and year.
    
    Returns all roster entries for the specified month, sorted by date and doctor.
    """
    from app.models.doctor import Doctor
    
    service = RosterService(session)
    
    try:
        # Validate month
        if month < 1 or month > 12:
            raise HTTPException(status_code=400, detail="Month must be between 1 and 12")
        
        # Get roster entries
        roster_entries = service.get_monthly_roster(year, month)
        
        # Convert to response format
        entries = []
        for entry in roster_entries:
            # Get doctor name
            doctor = session.get(Doctor, entry.doctor_id)
            doctor_name = doctor.name if doctor else f"Doctor {entry.doctor_id}"
            
            entries.append(
                RosterEntry(
                    roster_id=entry.roster_id,
                    date=entry.date,
                    doctor_id=entry.doctor_id,
                    doctor_name=doctor_name,
                    shift_type=entry.shift_type,
                    source=entry.source
                )
            )
        
        return RosterListResponse(
            year=year,
            month=month,
            entries=entries,
            total_entries=len(entries)
        )
    except HTTPException:
        raise
    except Exception as e:
        error_detail = str(e)
        import traceback
        print(f"Error in list_roster: {error_detail}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=error_detail)

