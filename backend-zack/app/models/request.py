"""Shift request model."""

from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from datetime import date as date_type
from enum import Enum
from app.models.pattern import ShiftType


class RequestStatus(str, Enum):
    """Request status enumeration."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ShiftRequest(SQLModel, table=True):
    """
    Shift request table.
    
    Stores confirmed shift requests from flexible doctors.
    Max 4 approved requests per month per doctor.
    """
    __tablename__ = "shift_requests"
    
    request_id: Optional[int] = Field(default=None, primary_key=True)
    doctor_id: int = Field(foreign_key="doctor.doctor_id", index=True)
    date: date_type = Field(index=True)
    shift_type: ShiftType
    status: RequestStatus = Field(default=RequestStatus.PENDING, index=True)
    
    # Relationships
    doctor: Optional["Doctor"] = Relationship(back_populates="shift_requests")

