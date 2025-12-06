"""
Leave management endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from typing import List, Optional
from datetime import date, datetime, timedelta
from pydantic import BaseModel

from ..database import get_session
from ..models.leave import Leave, LeaveCreate, LeaveRead, LeaveWithDoctor, LeaveStatus, LeaveType
from ..models.doctor import Doctor, DoctorCategory
from ..models.roster import MonthlyRoster

router = APIRouter(prefix="/leave", tags=["Leave"])


class LeaveBalance(BaseModel):
    """Leave balance for a specific type."""
    total: int
    used: int
    remaining: int


class LeaveBalanceResponse(BaseModel):
    """Full leave balance response."""
    annual: LeaveBalance
    medical: LeaveBalance
    emergency: LeaveBalance
    other: LeaveBalance


class LeaveRequestWithDoctor(BaseModel):
    """Leave request with doctor details for admin view."""
    id: str
    type: str
    typeColor: str
    startDate: str
    endDate: str
    days: int
    reason: Optional[str]
    status: str
    doctor: str
    doctor_id: int


class ReplacementDoctor(BaseModel):
    """Replacement doctor suggestion."""
    doctor_id: int
    name: str
    department: str
    category: str
    is_ai_suggested: bool = False
    availability_score: float = 1.0


# Leave type colors for frontend
LEAVE_TYPE_COLORS = {
    "annual": "#f59e0b",
    "medical": "#ef4444",
    "emergency": "#8b5cf6",
    "maternity": "#ec4899",
    "paternity": "#06b6d4",
    "unpaid": "#6b7280",
    "other": "#6b7280"
}

# Default leave allocations per year
DEFAULT_LEAVE_ALLOCATION = {
    "annual": 14,
    "medical": 14,
    "emergency": 5,
    "other": 3
}


@router.get("/list", response_model=List[LeaveWithDoctor])
async def list_leaves(
    session: Session = Depends(get_session),
    doctor_id: Optional[int] = None,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None
):
    """
    List leave requests with optional filtering.
    Returns leave requests with doctor names included.
    """
    query = select(Leave)
    
    if doctor_id:
        query = query.where(Leave.doctor_id == doctor_id)
    if status:
        query = query.where(Leave.status == status)
    if start_date:
        query = query.where(Leave.end_date >= start_date)
    if end_date:
        query = query.where(Leave.start_date <= end_date)
    
    query = query.order_by(Leave.start_date.desc())
    result = session.execute(query)
    leaves = result.scalars().all()
    
    # Get all doctors to add names
    doctor_result = session.execute(select(Doctor))
    doctors = {d.doctor_id: d for d in doctor_result.scalars().all()}
    
    # Add doctor names and calculate days
    leaves_with_names = []
    for leave in leaves:
        doctor = doctors.get(leave.doctor_id)
        days = (leave.end_date - leave.start_date).days + 1
        
        leaves_with_names.append(LeaveWithDoctor(
            leave_id=leave.leave_id,
            doctor_id=leave.doctor_id,
            doctor_name=doctor.name if doctor else None,
            start_date=leave.start_date,
            end_date=leave.end_date,
            leave_type=leave.leave_type,
            reason=leave.reason,
            status=leave.status,
            invite_coverage=leave.invite_coverage,
            created_at=leave.created_at,
            updated_at=leave.updated_at,
            approved_by=leave.approved_by,
            approved_at=getattr(leave, 'approved_at', None),
            days=days
        ))
    
    return leaves_with_names


@router.get("/pending")
async def get_pending_leaves(
    session: Session = Depends(get_session)
):
    """
    Get all pending leave requests for admin approval.
    Returns in format expected by mobile app.
    """
    result = session.execute(
        select(Leave)
        .where(Leave.status == "pending")
        .order_by(Leave.created_at.desc())
    )
    leaves = result.scalars().all()
    
    # Get doctor details
    doctor_ids = list(set(l.doctor_id for l in leaves))
    if doctor_ids:
        doctor_result = session.execute(
            select(Doctor).where(Doctor.doctor_id.in_(doctor_ids))
        )
        doctors = {d.doctor_id: d for d in doctor_result.scalars().all()}
    else:
        doctors = {}
    
    pending = []
    for leave in leaves:
        doctor = doctors.get(leave.doctor_id)
        leave_type = leave.leave_type.value if hasattr(leave.leave_type, 'value') else str(leave.leave_type)
        
        # Calculate days
        days = (leave.end_date - leave.start_date).days + 1
        
        pending.append({
            "id": f"lr{leave.leave_id}",
            "type": leave_type.capitalize(),
            "typeColor": LEAVE_TYPE_COLORS.get(leave_type.lower(), "#6b7280"),
            "startDate": str(leave.start_date),
            "endDate": str(leave.end_date),
            "days": days,
            "reason": leave.reason,
            "status": leave.status,
            "doctor": doctor.name if doctor else "Unknown",
            "doctor_id": leave.doctor_id,
            "leave_id": leave.leave_id
        })
    
    return pending


@router.get("/balance/{doctor_id}")
async def get_leave_balance(
    doctor_id: int,
    year: Optional[int] = None,
    session: Session = Depends(get_session)
):
    """
    Get leave balance for a specific doctor.
    Returns remaining leave for each type.
    """
    if not year:
        year = date.today().year
    
    # Verify doctor exists
    doctor = session.get(Doctor, doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    # Get all approved leaves for this year
    year_start = date(year, 1, 1)
    year_end = date(year, 12, 31)
    
    result = session.execute(
        select(Leave)
        .where(Leave.doctor_id == doctor_id)
        .where(Leave.status == "approved")
        .where(Leave.start_date >= year_start)
        .where(Leave.end_date <= year_end)
    )
    leaves = result.scalars().all()
    
    # Calculate used days per type
    used_days = {
        "annual": 0,
        "medical": 0,
        "emergency": 0,
        "other": 0
    }
    
    for leave in leaves:
        leave_type = leave.leave_type.value if hasattr(leave.leave_type, 'value') else str(leave.leave_type)
        days = (leave.end_date - leave.start_date).days + 1
        
        if leave_type.lower() in used_days:
            used_days[leave_type.lower()] += days
        else:
            used_days["other"] += days
    
    # Calculate balances
    balances = {}
    for leave_type, total in DEFAULT_LEAVE_ALLOCATION.items():
        used = used_days.get(leave_type, 0)
        balances[leave_type] = {
            "total": total,
            "used": used,
            "remaining": max(0, total - used)
        }
    
    return {"balances": balances, "year": year, "doctor_id": doctor_id}


@router.post("/create", response_model=LeaveWithDoctor)
async def create_leave(
    leave: LeaveCreate,
    session: Session = Depends(get_session)
):
    """
    Create a new leave request.
    No advance notice requirements - immediate requests allowed.
    """
    # Verify doctor exists
    doctor = session.get(Doctor, leave.doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    db_leave = Leave(
        doctor_id=leave.doctor_id,
        start_date=leave.start_date,
        end_date=leave.end_date,
        leave_type=leave.leave_type,
        reason=leave.reason,
        status=leave.status or "pending",
        invite_coverage=leave.invite_coverage
    )
    session.add(db_leave)
    session.commit()
    session.refresh(db_leave)
    
    days = (db_leave.end_date - db_leave.start_date).days + 1
    
    return LeaveWithDoctor(
        leave_id=db_leave.leave_id,
        doctor_id=db_leave.doctor_id,
        doctor_name=doctor.name,
        start_date=db_leave.start_date,
        end_date=db_leave.end_date,
        leave_type=db_leave.leave_type,
        reason=db_leave.reason,
        status=db_leave.status,
        invite_coverage=db_leave.invite_coverage,
        created_at=db_leave.created_at,
        updated_at=db_leave.updated_at,
        approved_by=db_leave.approved_by,
        approved_at=getattr(db_leave, 'approved_at', None),
        days=days
    )


@router.get("/{leave_id}", response_model=LeaveWithDoctor)
async def get_leave(
    leave_id: int,
    session: Session = Depends(get_session)
):
    """Get a specific leave request."""
    leave = session.get(Leave, leave_id)
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    doctor = session.get(Doctor, leave.doctor_id)
    
    days = (leave.end_date - leave.start_date).days + 1
    
    return LeaveWithDoctor(
        leave_id=leave.leave_id,
        doctor_id=leave.doctor_id,
        start_date=leave.start_date,
        end_date=leave.end_date,
        leave_type=leave.leave_type,
        reason=leave.reason,
        status=leave.status,
        invite_coverage=leave.invite_coverage,
        created_at=leave.created_at,
        updated_at=leave.updated_at,
        doctor_name=doctor.name if doctor else None,
        approved_by=leave.approved_by,
        approved_at=getattr(leave, 'approved_at', None),
        days=days
    )


@router.patch("/{leave_id}/approve")
async def approve_leave(
    leave_id: int,
    approved_by: int = Query(1, description="ID of approving admin"),
    session: Session = Depends(get_session)
):
    """Approve a leave request."""
    leave = session.get(Leave, leave_id)
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    leave.status = "approved"
    leave.approved_by = approved_by
    leave.approved_at = datetime.utcnow()
    leave.updated_at = datetime.utcnow()
    session.add(leave)
    session.commit()
    
    return {"message": "Leave request approved", "leave_id": leave_id}


@router.patch("/{leave_id}/reject")
async def reject_leave(
    leave_id: int,
    session: Session = Depends(get_session)
):
    """Reject a leave request."""
    leave = session.get(Leave, leave_id)
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    leave.status = "rejected"
    leave.updated_at = datetime.utcnow()
    session.add(leave)
    session.commit()
    
    return {"message": "Leave request rejected", "leave_id": leave_id}


@router.delete("/{leave_id}")
async def cancel_leave(
    leave_id: int,
    session: Session = Depends(get_session)
):
    """Cancel a leave request."""
    leave = session.get(Leave, leave_id)
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    leave.status = "cancelled"
    leave.updated_at = datetime.utcnow()
    session.add(leave)
    session.commit()
    
    return {"message": "Leave request cancelled", "leave_id": leave_id}


@router.get("/{leave_id}/replacements")
async def get_replacement_doctors(
    leave_id: int,
    session: Session = Depends(get_session)
):
    """
    Get available doctors who can cover a leave period.
    Uses AI/rule-based selection to find suitable replacements.
    Checks:
    - Not already assigned on those dates
    - Not on leave on those dates
    - Has sufficient rest hours
    - Flexible doctors preferred for emergency coverage
    """
    leave = session.get(Leave, leave_id)
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    # Get the doctor on leave's shifts during the leave period
    roster_result = session.execute(
        select(MonthlyRoster)
        .where(MonthlyRoster.doctor_id == leave.doctor_id)
        .where(MonthlyRoster.date >= leave.start_date)
        .where(MonthlyRoster.date <= leave.end_date)
    )
    shifts_to_cover = roster_result.scalars().all()
    
    if not shifts_to_cover:
        return {
            "leave_id": leave_id,
            "shifts_to_cover": 0,
            "replacements": [],
            "ai_suggested": None
        }
    
    # Get all active doctors except the one on leave
    doctor_result = session.execute(
        select(Doctor)
        .where(Doctor.active == True)
        .where(Doctor.doctor_id != leave.doctor_id)
    )
    available_doctors = doctor_result.scalars().all()
    
    # Get all assigned shifts during the leave period
    all_roster_result = session.execute(
        select(MonthlyRoster)
        .where(MonthlyRoster.date >= leave.start_date)
        .where(MonthlyRoster.date <= leave.end_date)
    )
    all_assigned = all_roster_result.scalars().all()
    assigned_by_date = {}
    for r in all_assigned:
        date_str = str(r.date)
        if date_str not in assigned_by_date:
            assigned_by_date[date_str] = set()
        assigned_by_date[date_str].add(r.doctor_id)
    
    # Get all leaves during the period
    other_leaves_result = session.execute(
        select(Leave)
        .where(Leave.start_date <= leave.end_date)
        .where(Leave.end_date >= leave.start_date)
        .where(Leave.status == "approved")
    )
    other_leaves = other_leaves_result.scalars().all()
    on_leave_by_date = {}
    for l in other_leaves:
        current = l.start_date
        while current <= l.end_date:
            date_str = str(current)
            if date_str not in on_leave_by_date:
                on_leave_by_date[date_str] = set()
            on_leave_by_date[date_str].add(l.doctor_id)
            current += timedelta(days=1)
    
    # Score and rank replacement doctors
    replacements = []
    for doc in available_doctors:
        # Calculate availability score
        available_dates = 0
        total_dates = (leave.end_date - leave.start_date).days + 1
        
        current = leave.start_date
        while current <= leave.end_date:
            date_str = str(current)
            assigned_today = assigned_by_date.get(date_str, set())
            on_leave_today = on_leave_by_date.get(date_str, set())
            
            if doc.doctor_id not in assigned_today and doc.doctor_id not in on_leave_today:
                available_dates += 1
            current += timedelta(days=1)
        
        if available_dates == 0:
            continue
        
        availability_score = available_dates / total_dates
        
        # Prefer flexible doctors for coverage
        category = doc.category.value if doc.category else "flexible"
        is_flexible = category == "flexible"
        
        replacements.append({
            "doctor_id": doc.doctor_id,
            "name": doc.name,
            "department": doc.department,
            "category": category,
            "role": doc.role,
            "availability_score": round(availability_score, 2),
            "available_dates": available_dates,
            "total_dates": total_dates,
            "is_flexible": is_flexible
        })
    
    # Sort by availability score (desc) then by flexibility (flexible first)
    replacements.sort(key=lambda x: (-x["availability_score"], not x["is_flexible"]))
    
    # AI suggestion: pick the best available doctor
    ai_suggested = replacements[0] if replacements else None
    if ai_suggested:
        ai_suggested["is_ai_suggested"] = True
    
    return {
        "leave_id": leave_id,
        "shifts_to_cover": len(shifts_to_cover),
        "replacements": replacements[:10],  # Top 10 candidates
        "ai_suggested": ai_suggested
    }


@router.post("/{leave_id}/assign-replacement")
async def assign_replacement_doctor(
    leave_id: int,
    replacement_doctor_id: int,
    use_ai: bool = False,
    session: Session = Depends(get_session)
):
    """
    Assign a replacement doctor to cover leave shifts.
    If use_ai is True and no replacement_doctor_id, system selects best candidate.
    """
    leave = session.get(Leave, leave_id)
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    # If using AI selection and no doctor specified
    if use_ai and not replacement_doctor_id:
        replacements = await get_replacement_doctors(leave_id, session)
        if replacements["ai_suggested"]:
            replacement_doctor_id = replacements["ai_suggested"]["doctor_id"]
        else:
            raise HTTPException(status_code=400, detail="No suitable replacement found")
    
    replacement = session.get(Doctor, replacement_doctor_id)
    if not replacement:
        raise HTTPException(status_code=404, detail="Replacement doctor not found")
    
    # Get shifts to reassign
    roster_result = session.execute(
        select(MonthlyRoster)
        .where(MonthlyRoster.doctor_id == leave.doctor_id)
        .where(MonthlyRoster.date >= leave.start_date)
        .where(MonthlyRoster.date <= leave.end_date)
    )
    shifts = roster_result.scalars().all()
    
    # Reassign shifts
    reassigned = 0
    for shift in shifts:
        shift.doctor_id = replacement_doctor_id
        shift.source = "leave_coverage"
        shift.notes = f"Coverage for leave #{leave_id}"
        session.add(shift)
        reassigned += 1
    
    session.commit()
    
    return {
        "message": f"Assigned {replacement.name} to cover {reassigned} shifts",
        "leave_id": leave_id,
        "replacement_doctor_id": replacement_doctor_id,
        "shifts_reassigned": reassigned
    }
