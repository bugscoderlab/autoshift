"""Leave-related schemas."""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date
from app.models.leave import LeaveType, LeaveStatus


class LeaveCreateRequest(BaseModel):
    """Request schema for creating leave."""
    doctor_id: int
    date: date
    type: LeaveType = LeaveType.ANNUAL
    status: LeaveStatus = LeaveStatus.PENDING


class LeaveResponse(BaseModel):
    """Response schema for leave."""
    leave_id: int
    doctor_id: int
    doctor_name: Optional[str] = None
    date: date
    type: LeaveType
    status: LeaveStatus


class LeaveListResponse(BaseModel):
    """Response schema for leave list."""
    leaves: List[LeaveResponse]
    total: int

