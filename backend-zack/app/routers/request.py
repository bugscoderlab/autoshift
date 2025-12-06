"""Shift request endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from app.db.session import get_session
from app.services.request_service import RequestService
from app.schemas.request import (
    ShiftRequestCreateRequest,
    ShiftRequestResponse,
    ShiftRequestListResponse
)
from app.models.request import RequestStatus
from app.exceptions import ValidationError


router = APIRouter(prefix="/requests", tags=["requests"])


@router.post("/shift", response_model=ShiftRequestResponse)
def create_shift_request(
    request: ShiftRequestCreateRequest,
    session: Session = Depends(get_session)
) -> ShiftRequestResponse:
    """
    Create a new shift request.
    
    Only flexible doctors can make shift requests.
    Maximum 4 approved requests per month per doctor.
    """
    service = RequestService(session)
    
    try:
        shift_request = service.create_shift_request(request)
        
        # Get doctor name
        from app.models.doctor import Doctor
        doctor = session.get(Doctor, shift_request.doctor_id)
        doctor_name = doctor.name if doctor else None
        
        return ShiftRequestResponse(
            request_id=shift_request.request_id,
            doctor_id=shift_request.doctor_id,
            doctor_name=doctor_name,
            date=shift_request.date,
            shift_type=shift_request.shift_type,
            status=shift_request.status
        )
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/shift", response_model=ShiftRequestListResponse)
def list_shift_requests(
    doctor_id: Optional[int] = Query(None, description="Filter by doctor ID"),
    year: Optional[int] = Query(None, description="Filter by year"),
    month: Optional[int] = Query(None, description="Filter by month"),
    status: Optional[RequestStatus] = Query(None, description="Filter by status"),
    session: Session = Depends(get_session)
) -> ShiftRequestListResponse:
    """
    List shift requests with optional filters.
    """
    service = RequestService(session)
    
    try:
        requests = service.list_requests(
            doctor_id=doctor_id,
            year=year,
            month=month,
            status=status
        )
        
        # Get doctor names
        from app.models.doctor import Doctor
        request_responses = []
        for req in requests:
            doctor = session.get(Doctor, req.doctor_id)
            doctor_name = doctor.name if doctor else None
            
            request_responses.append(
                ShiftRequestResponse(
                    request_id=req.request_id,
                    doctor_id=req.doctor_id,
                    doctor_name=doctor_name,
                    date=req.date,
                    shift_type=req.shift_type,
                    status=req.status
                )
            )
        
        return ShiftRequestListResponse(
            requests=request_responses,
            total=len(request_responses)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

