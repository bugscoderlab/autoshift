"""
Monthly roster model for shift assignments.
"""

from sqlalchemy import Column, Integer, String, Date
from pydantic import BaseModel
from typing import Optional
from datetime import date
from enum import Enum

from .base import Base


class ShiftType(str, Enum):
    """Shift type enum."""
    MORNING = "morning"
    EVENING = "evening"
    NIGHT = "night"


class RosterSource(str, Enum):
    """Roster source enum - how the shift was assigned."""
    AUTO = "auto"
    MANUAL = "manual"
    FIXED_PATTERN = "fixed-pattern"
    SWAP = "swap"
    REQUEST = "request"


class MonthlyRoster(Base):
    """Monthly roster database model."""
    __tablename__ = "monthly_roster"
    
    roster_id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False, index=True)
    doctor_id = Column(Integer, nullable=False, index=True)
    shift_type = Column(String(20), nullable=False)
    source = Column(String(20), default="auto")
    start_time = Column(String(10), nullable=True)
    end_time = Column(String(10), nullable=True)
    notes = Column(String(500), nullable=True)


# Pydantic schemas
class RosterBase(BaseModel):
    """Base roster schema."""
    date: date
    doctor_id: int
    shift_type: str
    source: str = "auto"
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    notes: Optional[str] = None


class RosterCreate(RosterBase):
    """Schema for creating a roster entry."""
    pass


class RosterRead(RosterBase):
    """Schema for reading a roster entry."""
    roster_id: int
    
    class Config:
        from_attributes = True


class RosterWithDoctor(RosterRead):
    """Schema for roster with doctor details."""
    doctor_name: Optional[str] = None
    doctor_department: Optional[str] = None
