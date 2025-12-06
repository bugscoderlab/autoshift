"""
Swap request model for shift swap requests between doctors.
"""

from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from enum import Enum

from .base import Base


class SwapStatus(str, Enum):
    """Swap status enum."""
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


class SwapRequest(Base):
    """Swap request database model."""
    __tablename__ = "swap_request"
    
    swap_id = Column(Integer, primary_key=True, autoincrement=True)
    requester_id = Column(Integer, nullable=False, index=True)
    requester_shift_date = Column(Date, nullable=False)
    requester_shift_type = Column(String(20), nullable=False)
    target_id = Column(Integer, nullable=True)
    target_shift_date = Column(Date, nullable=True)
    target_shift_type = Column(String(20), nullable=True)
    is_broadcast = Column(Boolean, default=False)
    reason = Column(String(500), nullable=True)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    accepted_by = Column(Integer, nullable=True)
    accepted_at = Column(DateTime, nullable=True)


# Pydantic schemas
class SwapRequestBase(BaseModel):
    """Base swap request schema."""
    requester_id: int
    requester_shift_date: date
    requester_shift_type: str
    target_id: Optional[int] = None
    target_shift_date: Optional[date] = None
    target_shift_type: Optional[str] = None
    is_broadcast: bool = False
    reason: Optional[str] = None
    status: str = "pending"


class SwapRequestCreate(SwapRequestBase):
    """Schema for creating a swap request."""
    pass


class SwapRequestRead(SwapRequestBase):
    """Schema for reading a swap request."""
    swap_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class SwapRequestWithDetails(SwapRequestRead):
    """Schema for swap with doctor details."""
    requester_name: Optional[str] = None
    target_name: Optional[str] = None
