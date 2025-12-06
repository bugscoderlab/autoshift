"""
Swap request endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, or_
from typing import List, Optional
from datetime import date, datetime, timedelta
from pydantic import BaseModel

from ..database import get_session
from ..models.swap_request import SwapRequest, SwapRequestCreate, SwapRequestRead, SwapRequestWithDetails, SwapStatus
from ..models.doctor import Doctor, DoctorCategory
from ..models.roster import MonthlyRoster
from ..models.leave import Leave

router = APIRouter(prefix="/swap", tags=["Swap"])


class AvailableDoctor(BaseModel):
    """Available doctor for swap."""
    id: str
    name: str
    type: str  # permanent/flexible
    department: str
    doctor_id: int
    is_available: bool = True
    reason: Optional[str] = None


@router.get("/", response_model=List[SwapRequestWithDetails])
async def list_swaps(
    session: Session = Depends(get_session),
    doctor_id: Optional[int] = None,
    requester_id: Optional[int] = None,
    target_id: Optional[int] = None,
    status: Optional[str] = None
):
    """
    List swap requests with optional filtering.
    Returns swap requests with doctor names included.
    """
    query = select(SwapRequest)
    
    # If doctor_id provided, get swaps where they are requester or target
    if doctor_id:
        query = query.where(
            or_(
                SwapRequest.requester_id == doctor_id,
                SwapRequest.target_id == doctor_id
            )
        )
    elif requester_id:
        query = query.where(SwapRequest.requester_id == requester_id)
    
    if target_id:
        query = query.where(SwapRequest.target_id == target_id)
    if status:
        query = query.where(SwapRequest.status == status)
    
    query = query.order_by(SwapRequest.created_at.desc())
    result = session.execute(query)
    swaps = result.scalars().all()
    
    # Get all doctors to add names
    doctor_result = session.execute(select(Doctor))
    doctors = {d.doctor_id: d for d in doctor_result.scalars().all()}
    
    # Add doctor names to swap requests
    swaps_with_names = []
    for swap in swaps:
        requester = doctors.get(swap.requester_id)
        target = doctors.get(swap.target_id) if swap.target_id else None
        
        swaps_with_names.append(SwapRequestWithDetails(
            swap_id=swap.swap_id,
            requester_id=swap.requester_id,
            requester_shift_date=swap.requester_shift_date,
            requester_shift_type=swap.requester_shift_type,
            target_id=swap.target_id,
            target_shift_date=swap.target_shift_date,
            target_shift_type=swap.target_shift_type,
            is_broadcast=swap.is_broadcast,
            reason=swap.reason,
            status=swap.status,
            created_at=swap.created_at,
            updated_at=swap.updated_at,
            requester_name=requester.name if requester else None,
            target_name=target.name if target else None
        ))
    
    return swaps_with_names


@router.post("/request", response_model=SwapRequestRead)
async def create_swap_request(
    swap: SwapRequestCreate,
    session: Session = Depends(get_session)
):
    """
    Create a new swap request.
    """
    # Verify requester exists
    requester = session.get(Doctor, swap.requester_id)
    if not requester:
        raise HTTPException(status_code=404, detail="Requester doctor not found")
    
    # If target specified, verify target exists and prevent self-swap
    if swap.target_id:
        if swap.target_id == swap.requester_id:
            raise HTTPException(status_code=400, detail="Cannot swap with yourself")
        target = session.get(Doctor, swap.target_id)
        if not target:
            raise HTTPException(status_code=404, detail="Target doctor not found")
    
    db_swap = SwapRequest(
        requester_id=swap.requester_id,
        requester_shift_date=swap.requester_shift_date,
        requester_shift_type=swap.requester_shift_type,
        target_id=swap.target_id,
        target_shift_date=swap.target_shift_date,
        target_shift_type=swap.target_shift_type,
        is_broadcast=swap.is_broadcast,
        reason=swap.reason,
        status=swap.status or "pending"
    )
    session.add(db_swap)
    session.commit()
    session.refresh(db_swap)
    
    return db_swap


@router.get("/{swap_id}", response_model=SwapRequestWithDetails)
async def get_swap(
    swap_id: int,
    session: Session = Depends(get_session)
):
    """Get a specific swap request."""
    swap = session.get(SwapRequest, swap_id)
    if not swap:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    requester = session.get(Doctor, swap.requester_id)
    target = session.get(Doctor, swap.target_id) if swap.target_id else None
    
    return SwapRequestWithDetails(
        swap_id=swap.swap_id,
        requester_id=swap.requester_id,
        requester_shift_date=swap.requester_shift_date,
        requester_shift_type=swap.requester_shift_type,
        target_id=swap.target_id,
        target_shift_date=swap.target_shift_date,
        target_shift_type=swap.target_shift_type,
        is_broadcast=swap.is_broadcast,
        reason=swap.reason,
        status=swap.status,
        created_at=swap.created_at,
        updated_at=swap.updated_at,
        requester_name=requester.name if requester else None,
        target_name=target.name if target else None
    )


@router.patch("/{swap_id}/accept")
async def accept_swap(
    swap_id: int,
    accepted_by: int,
    session: Session = Depends(get_session)
):
    """Accept a swap request and update roster."""
    swap = session.get(SwapRequest, swap_id)
    if not swap:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    if swap.status != "pending":
        raise HTTPException(status_code=400, detail="Swap request is not pending")
    
    swap.status = "accepted"
    swap.accepted_by = accepted_by
    swap.accepted_at = datetime.utcnow()
    
    if swap.is_broadcast:
        swap.target_id = accepted_by
    
    session.add(swap)
    
    # Update roster - swap the shifts
    requester_roster = session.execute(
        select(MonthlyRoster)
        .where(MonthlyRoster.doctor_id == swap.requester_id)
        .where(MonthlyRoster.date == swap.requester_shift_date)
    ).scalars().first()
    
    if requester_roster:
        # Update the roster entry to the new doctor
        requester_roster.doctor_id = accepted_by
        requester_roster.source = "swap"
        session.add(requester_roster)
    
    # Cancel other pending swaps for the same shift
    if swap.is_broadcast:
        result = session.execute(
            select(SwapRequest)
            .where(SwapRequest.requester_id == swap.requester_id)
            .where(SwapRequest.requester_shift_date == swap.requester_shift_date)
            .where(SwapRequest.status == "pending")
            .where(SwapRequest.swap_id != swap_id)
        )
        other_swaps = result.scalars().all()
        for other in other_swaps:
            other.status = "cancelled"
            session.add(other)
    
    session.commit()
    
    return {"message": "Swap request accepted and roster updated", "swap_id": swap_id}


@router.patch("/{swap_id}/reject")
async def reject_swap(
    swap_id: int,
    session: Session = Depends(get_session)
):
    """Reject a swap request."""
    swap = session.get(SwapRequest, swap_id)
    if not swap:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    swap.status = "rejected"
    session.add(swap)
    session.commit()
    
    return {"message": "Swap request rejected", "swap_id": swap_id}


@router.delete("/{swap_id}")
async def cancel_swap(
    swap_id: int,
    session: Session = Depends(get_session)
):
    """Cancel a swap request."""
    swap = session.get(SwapRequest, swap_id)
    if not swap:
        raise HTTPException(status_code=404, detail="Swap request not found")
    
    swap.status = "cancelled"
    session.add(swap)
    session.commit()
    
    return {"message": "Swap request cancelled", "swap_id": swap_id}


@router.get("/available-doctors/{shift_date}")
async def get_available_doctors(
    shift_date: date,
    shift_type: Optional[str] = None,
    requester_id: Optional[int] = None,
    include_permanent: bool = True,
    include_flexible: bool = True,
    session: Session = Depends(get_session)
):
    """
    Get doctors available for a swap on a specific date.
    Checks:
    - Not already assigned to a shift on that date
    - Not on leave on that date
    - Has enough rest hours if they worked the previous day
    - Meets rule compliance (no back-to-back night shifts, etc.)
    """
    MIN_REST_HOURS = 11
    
    # Get all active doctors
    query = select(Doctor).where(Doctor.active == True)
    
    # Filter by category if specified
    if not include_permanent and not include_flexible:
        return {"date": str(shift_date), "available_doctors": [], "shift_type": shift_type}
    
    if not include_permanent:
        query = query.where(Doctor.category != DoctorCategory.FIXED)
    if not include_flexible:
        query = query.where(Doctor.category == DoctorCategory.FIXED)
    
    result = session.execute(query)
    all_doctors = result.scalars().all()
    
    # Get doctors already assigned on that date
    roster_result = session.execute(
        select(MonthlyRoster)
        .where(MonthlyRoster.date == shift_date)
    )
    assigned = roster_result.scalars().all()
    assigned_ids = {r.doctor_id for r in assigned}
    
    # Get doctors on leave on that date
    leave_result = session.execute(
        select(Leave)
        .where(Leave.start_date <= shift_date)
        .where(Leave.end_date >= shift_date)
        .where(Leave.status == "approved")
    )
    on_leave = leave_result.scalars().all()
    on_leave_ids = {l.doctor_id for l in on_leave}
    
    # Check previous day roster for rest rule compliance
    prev_date = shift_date - timedelta(days=1)
    prev_roster_result = session.execute(
        select(MonthlyRoster)
        .where(MonthlyRoster.date == prev_date)
    )
    prev_shifts = prev_roster_result.scalars().all()
    
    # Build map of who worked night shift yesterday
    worked_night_yesterday = set()
    for shift in prev_shifts:
        shift_type_val = shift.shift_type.value if hasattr(shift.shift_type, 'value') else str(shift.shift_type)
        if shift_type_val.lower() in ['night', 'evening']:
            worked_night_yesterday.add(shift.doctor_id)
    
    # Filter to available doctors with compliance check
    available = []
    for d in all_doctors:
        # Skip requester
        if requester_id and d.doctor_id == requester_id:
            continue
        
        # Skip if already assigned
        if d.doctor_id in assigned_ids:
            continue
        
        # Skip if on leave
        if d.doctor_id in on_leave_ids:
            continue
        
        # Check rest rule - if worked night yesterday, can't work morning today
        is_morning_shift = shift_type and shift_type.lower() in ['morning', '8-4']
        if d.doctor_id in worked_night_yesterday and is_morning_shift:
            continue  # Would violate 11-hour rest rule
        
        # Doctor is available
        category_value = d.category.value if d.category else "flexible"
        doc_type = "permanent" if category_value == "fixed" else "flexible"
        
        available.append({
            "id": str(d.doctor_id),
            "name": d.name,
            "type": doc_type,
            "department": d.department,
            "doctor_id": d.doctor_id,
            "role": d.role
        })
    
    return {
        "date": str(shift_date),
        "shift_type": shift_type,
        "available_doctors": available,
        "total_available": len(available)
    }


@router.get("/available-for-shift")
async def get_available_for_shift(
    shift_date: date,
    shift_hour: str = Query(..., description="Shift hour range: 8-4, 4-12, or 12-8"),
    include_permanent: bool = True,
    include_flexible: bool = True,
    requester_id: Optional[int] = None,
    session: Session = Depends(get_session)
):
    """
    Get doctors available for a specific shift time slot.
    This matches the mobile app's filter for shift hours.
    """
    # Map shift hour to shift type
    shift_type_map = {
        "8-4": "morning",
        "4-12": "evening", 
        "12-8": "night"
    }
    shift_type = shift_type_map.get(shift_hour, "morning")
    
    return await get_available_doctors(
        shift_date=shift_date,
        shift_type=shift_type,
        requester_id=requester_id,
        include_permanent=include_permanent,
        include_flexible=include_flexible,
        session=session
    )
