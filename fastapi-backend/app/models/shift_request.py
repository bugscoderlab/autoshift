"""
Shift request model for confirmed shift requests.
"""

from sqlalchemy import Column, Integer, String, Date, DateTime
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from enum import Enum

from .base import Base


class RequestStatus(str, Enum):
    """Request status enum."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class ShiftRequest(Base):
    """Shift request database model."""
    __tablename__ = "shift_request"
    
    request_id = Column(Integer, primary_key=True, autoincrement=True)
    doctor_id = Column(Integer, nullable=False, index=True)
    date = Column(Date, nullable=False)
    shift_type = Column(String(20), nullable=False)
    reason = Column(String(500), nullable=True)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    approved_by = Column(Integer, nullable=True)


# Pydantic schemas
class ShiftRequestBase(BaseModel):
    """Base shift request schema."""
    doctor_id: int
    date: date
    shift_type: str
    reason: Optional[str] = None
    status: str = "pending"


class ShiftRequestCreate(ShiftRequestBase):
    """Schema for creating a shift request."""
    pass


class ShiftRequestRead(ShiftRequestBase):
    """Schema for reading a shift request."""
    request_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
