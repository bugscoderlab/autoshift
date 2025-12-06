"""
Leave model for managing doctor leave requests.
"""

from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from enum import Enum

from .base import Base


class LeaveType(str, Enum):
    """Leave type enum."""
    ANNUAL = "annual"
    MEDICAL = "medical"
    EMERGENCY = "emergency"
    MATERNITY = "maternity"
    PATERNITY = "paternity"
    UNPAID = "unpaid"
    OTHER = "other"


class LeaveStatus(str, Enum):
    """Leave status enum."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class Leave(Base):
    """Leave database model."""
    __tablename__ = "leave"
    
    leave_id = Column(Integer, primary_key=True, autoincrement=True)
    doctor_id = Column(Integer, nullable=False, index=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    leave_type = Column(String(20), default="annual")
    reason = Column(String(500), nullable=True)
    status = Column(String(20), default="pending")
    invite_coverage = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    approved_by = Column(Integer, nullable=True)


# Pydantic schemas
class LeaveBase(BaseModel):
    """Base leave schema."""
    doctor_id: int
    start_date: date
    end_date: date
    leave_type: str = "annual"
    reason: Optional[str] = None
    status: str = "pending"
    invite_coverage: bool = False


class LeaveCreate(LeaveBase):
    """Schema for creating a leave request."""
    pass


class LeaveRead(LeaveBase):
    """Schema for reading a leave request."""
    leave_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class LeaveWithDoctor(LeaveRead):
    """Schema for leave with doctor details."""
    doctor_name: Optional[str] = None
