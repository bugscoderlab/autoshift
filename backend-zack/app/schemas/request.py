"""Shift request schemas."""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date
from app.models.pattern import ShiftType
from app.models.request import RequestStatus


class ShiftRequestCreateRequest(BaseModel):
    """Request schema for creating shift request."""
    doctor_id: int
    date: date
    shift_type: ShiftType
    status: RequestStatus = RequestStatus.PENDING


class ShiftRequestResponse(BaseModel):
    """Response schema for shift request."""
    request_id: int
    doctor_id: int
    doctor_name: Optional[str] = None
    date: date
    shift_type: ShiftType
    status: RequestStatus


class ShiftRequestListResponse(BaseModel):
    """Response schema for shift request list."""
    requests: List[ShiftRequestResponse]
    total: int

