"""Leave management endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from app.db.session import get_session
from app.services.leave_service import LeaveService
from app.schemas.leave import (
    LeaveCreateRequest,
    LeaveResponse,
    LeaveListResponse
)
from app.models.leave import LeaveStatus


router = APIRouter(prefix="/leave", tags=["leave"])


@router.post("/create", response_model=LeaveResponse)
def create_leave(
    request: LeaveCreateRequest,
    session: Session = Depends(get_session)
) -> LeaveResponse:
    """
    Create a new leave request.
    """
    service = LeaveService(session)
    
    try:
        leave = service.create_leave(request)
        
        # Get doctor name
        from app.models.doctor import Doctor
        doctor = session.get(Doctor, leave.doctor_id)
        doctor_name = doctor.name if doctor else None
        
        return LeaveResponse(
            leave_id=leave.leave_id,
            doctor_id=leave.doctor_id,
            doctor_name=doctor_name,
            date=leave.date,
            type=leave.leave_type,
            status=leave.status
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/list", response_model=LeaveListResponse)
def list_leaves(
    doctor_id: Optional[int] = Query(None, description="Filter by doctor ID"),
    year: Optional[int] = Query(None, description="Filter by year"),
    month: Optional[int] = Query(None, description="Filter by month"),
    status: Optional[LeaveStatus] = Query(None, description="Filter by status"),
    session: Session = Depends(get_session)
) -> LeaveListResponse:
    """
    List leave requests with optional filters.
    """
    service = LeaveService(session)
    
    try:
        leaves = service.list_leaves(
            doctor_id=doctor_id,
            year=year,
            month=month,
            status=status
        )
        
        # Get doctor names
        from app.models.doctor import Doctor
        leave_responses = []
        for leave in leaves:
            doctor = session.get(Doctor, leave.doctor_id)
            doctor_name = doctor.name if doctor else None
            
            leave_responses.append(
                LeaveResponse(
                    leave_id=leave.leave_id,
                    doctor_id=leave.doctor_id,
                    doctor_name=doctor_name,
                    date=leave.date,
                    type=leave.leave_type,
                    status=leave.status
                )
            )
        
        return LeaveListResponse(
            leaves=leave_responses,
            total=len(leave_responses)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

