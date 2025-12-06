"""
Roster management endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
from pydantic import BaseModel
from calendar import monthrange

from ..database import get_session
from ..models.roster import MonthlyRoster, RosterCreate, RosterRead, RosterWithDoctor, ShiftType, RosterSource
from ..models.doctor import Doctor, DoctorCategory
from ..models.leave import Leave, LeaveStatus
from ..models.shift_request import ShiftRequest, RequestStatus
from ..models.weekly_pattern import WeeklyFixedPattern
from ..ai.roster_ai import RosterAI
from ..rules.compliance import ComplianceChecker

router = APIRouter(prefix="/roster", tags=["Roster"])


class GenerateRosterRequest(BaseModel):
    """Request body for roster generation with rules."""
    year: int
    month: int
    use_ai: bool = True
    # Generation rules from frontend
    min_rest_hours: int = 11
    max_night_shifts: int = 4
    max_weekly_hours: int = 48
    min_staff_per_shift: int = 2
    max_consecutive_days: int = 6


class RepairRosterRequest(BaseModel):
    """Request body for roster repair."""
    year: int
    month: int
    use_ai: bool = True


class StaffMember(BaseModel):
    """Staff member in a shift."""
    name: str
    role: str
    avatar: str
    doctor_id: int
    category: str


class ShiftDetail(BaseModel):
    """Shift details with staff."""
    type: str
    time: str
    department: str
    staff: List[StaffMember]


@router.get("/", response_model=List[RosterWithDoctor])
async def list_roster(
    session: Session = Depends(get_session),
    year: Optional[int] = None,
    month: Optional[int] = None,
    doctor_id: Optional[int] = None,
    shift_type: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    """
    List roster entries with optional filtering.
    Returns roster entries with doctor names included.
    """
    query = select(MonthlyRoster)
    
    # If no year/month provided, use current month
    if not year and not month and not start_date and not end_date:
        today = date.today()
        year = today.year
        month = today.month
    
    if year and month:
        start = date(year, month, 1)
        end = date(year, month, monthrange(year, month)[1])
        query = query.where(MonthlyRoster.date >= start).where(MonthlyRoster.date <= end)
    elif start_date:
        query = query.where(MonthlyRoster.date >= start_date)
    
    if end_date:
        query = query.where(MonthlyRoster.date <= end_date)
    if doctor_id:
        query = query.where(MonthlyRoster.doctor_id == doctor_id)
    if shift_type:
        query = query.where(MonthlyRoster.shift_type == shift_type)
    
    query = query.order_by(MonthlyRoster.date)
    result = session.execute(query)
    roster_entries = result.scalars().all()
    
    # Get all doctors to add names
    doctor_result = session.execute(select(Doctor))
    doctors = {d.doctor_id: d for d in doctor_result.scalars().all()}
    
    # Add doctor names and departments to roster entries
    roster_with_names = []
    for r in roster_entries:
        doctor = doctors.get(r.doctor_id)
        roster_with_names.append(RosterWithDoctor(
            roster_id=r.roster_id,
            date=r.date,
            doctor_id=r.doctor_id,
            doctor_name=doctor.name if doctor else None,
            doctor_department=doctor.department if doctor else None,
            shift_type=r.shift_type,
            source=r.source,
            start_time=r.start_time,
            end_time=r.end_time,
            notes=r.notes
        ))
    
    return roster_with_names


@router.get("/calendar")
async def get_roster_calendar(
    year: Optional[int] = None,
    month: Optional[int] = None,
    session: Session = Depends(get_session)
):
    """
    Get roster in calendar format for a specific month.
    Returns shifts grouped by date with staff details.
    This matches the mobile app's expected format.
    """
    # Default to current month if not provided
    if not year or not month:
        today = date.today()
        year = year or today.year
        month = month or today.month
    
    start = date(year, month, 1)
    end = date(year, month, monthrange(year, month)[1])
    
    result = session.execute(
        select(MonthlyRoster)
        .where(MonthlyRoster.date >= start)
        .where(MonthlyRoster.date <= end)
        .order_by(MonthlyRoster.date)
    )
    roster = result.scalars().all()
    
    # Get all doctors
    doctor_result = session.execute(select(Doctor))
    doctors = {d.doctor_id: d for d in doctor_result.scalars().all()}
    
    # Group by date with staff details
    calendar: Dict[str, Dict[str, Any]] = {}
    
    for r in roster:
        date_str = str(r.date)
        if date_str not in calendar:
            calendar[date_str] = {
                "type": _get_shift_type_name(r.shift_type),
                "time": _get_shift_time(r.shift_type),
                "department": doctors.get(r.doctor_id).department if r.doctor_id in doctors else "General",
                "staff": []
            }
        
        doctor = doctors.get(r.doctor_id)
        if doctor:
            # Create avatar from initials
            name_parts = doctor.name.replace("Dr. ", "").split()
            avatar = "".join([p[0] for p in name_parts[:2]]).upper()
            
            calendar[date_str]["staff"].append({
                "name": doctor.name,
                "role": doctor.role,
                "avatar": avatar,
                "doctor_id": doctor.doctor_id,
                "category": doctor.category.value if doctor.category else "flexible"
            })
    
    return {
        "year": year,
        "month": month,
        "calendar": calendar,
        "total_shifts": len(roster),
        "total_staff": len(set(r.doctor_id for r in roster))
    }


@router.get("/my-shifts")
async def get_my_shifts(
    doctor_id: int,
    session: Session = Depends(get_session)
):
    """
    Get shifts for a specific doctor (for swap functionality).
    Returns upcoming shifts that can be swapped.
    """
    today = date.today()
    
    result = session.execute(
        select(MonthlyRoster)
        .where(MonthlyRoster.doctor_id == doctor_id)
        .where(MonthlyRoster.date >= today)
        .order_by(MonthlyRoster.date)
        .limit(10)
    )
    shifts = result.scalars().all()
    
    doctor = session.get(Doctor, doctor_id)
    
    return [
        {
            "id": str(s.roster_id),
            "date": s.date.strftime("%a, %b %d"),
            "type": _get_shift_type_name(s.shift_type),
            "time": _get_shift_time(s.shift_type),
            "department": doctor.department if doctor else "General",
            "roster_id": s.roster_id
        }
        for s in shifts
    ]


@router.post("/generate")
async def generate_roster(
    request: GenerateRosterRequest,
    session: Session = Depends(get_session)
):
    """
    Generate a monthly roster using AI and rule engine.
    Uses the provided rules to ensure compliance.
    """
    # Get all active doctors
    result = session.execute(select(Doctor).where(Doctor.active == True))
    doctors = result.scalars().all()
    
    doctors_list = [
        {
            "doctor_id": d.doctor_id,
            "name": d.name,
            "category": d.category.value if d.category else "flexible",
            "department": d.department,
            "role": d.role,
            "fte": d.fte,
            "join_date": str(d.join_date),
            "leave_date": str(d.leave_date) if d.leave_date else None,
            "weekly_fixed_pattern_id": d.weekly_fixed_pattern_id
        }
        for d in doctors
    ]
    
    # Get weekly patterns for fixed doctors
    patterns = {}
    for d in doctors:
        if d.weekly_fixed_pattern_id:
            pattern = session.get(WeeklyFixedPattern, d.weekly_fixed_pattern_id)
            if pattern:
                if d.doctor_id not in patterns:
                    patterns[d.doctor_id] = {}
                patterns[d.doctor_id][pattern.week_number] = {
                    "day_1": pattern.day_1,
                    "day_2": pattern.day_2,
                    "day_3": pattern.day_3,
                    "day_4": pattern.day_4,
                    "day_5": pattern.day_5,
                    "day_6": pattern.day_6,
                    "day_7": pattern.day_7,
                }
    
    # Get approved leaves for the month
    start = date(request.year, request.month, 1)
    end = date(request.year, request.month, monthrange(request.year, request.month)[1])
    
    leave_result = session.execute(
        select(Leave)
        .where(Leave.start_date <= end)
        .where(Leave.end_date >= start)
        .where(Leave.status == "approved")
    )
    leaves = leave_result.scalars().all()
    
    leaves_list = [
        {
            "doctor_id": l.doctor_id,
            "start_date": str(l.start_date),
            "end_date": str(l.end_date),
            "type": l.leave_type
        }
        for l in leaves
    ]
    
    # Generation rules from request
    rules = {
        "min_rest_hours": request.min_rest_hours,
        "max_night_shifts": request.max_night_shifts,
        "max_weekly_hours": request.max_weekly_hours,
        "min_staff_per_shift": request.min_staff_per_shift,
        "max_consecutive_days": request.max_consecutive_days
    }
    
    # Generate roster using AI
    roster_ai = RosterAI()
    result = await roster_ai.generate_roster(
        year=request.year,
        month=request.month,
        doctors=doctors_list,
        patterns=patterns,
        leaves=leaves_list,
        shift_requests=[],
        rules=rules,
        use_ai=request.use_ai
    )
    
    return result


@router.post("/repair")
async def repair_roster(
    request: RepairRosterRequest,
    session: Session = Depends(get_session)
):
    """
    Repair a roster with violations using AI.
    """
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
            "shift_type": r.shift_type,
            "source": r.source
        }
        for r in roster
    ]
    
    # Get doctors
    doctor_result = session.execute(select(Doctor).where(Doctor.active == True))
    doctors = doctor_result.scalars().all()
    doctors_dict = {
        d.doctor_id: {
            "name": d.name,
            "category": d.category.value if d.category else "flexible",
            "department": d.department
        }
        for d in doctors
    }
    
    # Repair roster
    roster_ai = RosterAI()
    result = await roster_ai.repair_roster(
        roster=roster_list,
        doctors=doctors_dict,
        use_ai=request.use_ai
    )
    
    return result


@router.post("/save")
async def save_roster(
    roster_entries: List[RosterCreate],
    session: Session = Depends(get_session)
):
    """
    Save generated roster entries to database.
    """
    saved = []
    for entry in roster_entries:
        db_entry = MonthlyRoster(
            date=entry.date,
            doctor_id=entry.doctor_id,
            shift_type=entry.shift_type,
            source=entry.source,
            start_time=entry.start_time,
            end_time=entry.end_time,
            notes=entry.notes
        )
        session.add(db_entry)
        saved.append(db_entry)
    
    session.commit()
    
    return {
        "message": f"Saved {len(saved)} roster entries",
        "count": len(saved)
    }


@router.post("/check-compliance")
async def check_compliance(
    year: int,
    month: int,
    session: Session = Depends(get_session)
):
    """
    Check compliance for a specific month's roster.
    """
    start = date(year, month, 1)
    end = date(year, month, monthrange(year, month)[1])
    
    result = session.execute(
        select(MonthlyRoster)
        .where(MonthlyRoster.date >= start)
        .where(MonthlyRoster.date <= end)
    )
    roster = result.scalars().all()
    
    roster_list = [
        {
            "date": r.date,
            "doctor_id": r.doctor_id,
            "shift_type": r.shift_type,
            "start_time": r.start_time,
            "end_time": r.end_time
        }
        for r in roster
    ]
    
    doctor_result = session.execute(select(Doctor).where(Doctor.active == True))
    doctors = doctor_result.scalars().all()
    doctors_dict = {
        d.doctor_id: {
            "name": d.name,
            "category": d.category.value if d.category else "flexible",
            "department": d.department
        }
        for d in doctors
    }
    
    checker = ComplianceChecker()
    result = checker.check_roster_compliance(roster_list, doctors_dict)
    
    return result


def _get_shift_type_name(shift_type) -> str:
    """Convert shift type to display name."""
    if isinstance(shift_type, str):
        type_str = shift_type
    else:
        type_str = shift_type.value if shift_type else "morning"
    
    mapping = {
        "morning": "Morning",
        "afternoon": "Afternoon",
        "evening": "Evening",
        "night": "Night",
        "resus": "Resus",
        "edx": "EDx",
        "auc": "AUC",
        "off": "Off"
    }
    return mapping.get(type_str.lower(), type_str.capitalize())


def _get_shift_time(shift_type) -> str:
    """Convert shift type to time range."""
    if isinstance(shift_type, str):
        type_str = shift_type
    else:
        type_str = shift_type.value if shift_type else "morning"
    
    mapping = {
        "morning": "08:00-16:00",
        "afternoon": "12:00-20:00",
        "evening": "16:00-00:00",
        "night": "00:00-08:00",
        "resus": "08:00-16:00",
        "edx": "08:00-16:00",
        "auc": "08:00-16:00",
        "off": "Off"
    }
    return mapping.get(type_str.lower(), "08:00-16:00")
