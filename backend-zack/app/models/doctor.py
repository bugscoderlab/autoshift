"""Doctor model."""

from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import date as date_type
from enum import Enum


class DoctorCategory(str, Enum):
    """Doctor category enumeration."""
    FIXED = "fixed"
    FLEXIBLE = "flexible"


class Doctor(SQLModel, table=True):
    """
    Unified doctor table.
    
    Stores both fixed-shift and flexible-shift doctors.
    """
    __tablename__ = "doctor"
    
    doctor_id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True)
    category: DoctorCategory = Field(index=True)
    join_date: date_type
    leave_date: Optional[date_type] = Field(default=None, nullable=True)
    fte: float = Field(default=1.0, ge=0.0, le=1.0)
    active: bool = Field(default=True, index=True)
    weekly_fixed_pattern_id: Optional[int] = Field(
        default=None,
        foreign_key="weekly_fixed_pattern.pattern_id",
        nullable=True
    )
    
    # Relationships
    weekly_pattern: Optional["WeeklyFixedPattern"] = Relationship(
        back_populates="doctors"
    )
    roster_entries: List["MonthlyRoster"] = Relationship(back_populates="doctor")
    leave_entries: List["Leave"] = Relationship(back_populates="doctor")
    shift_requests: List["ShiftRequest"] = Relationship(back_populates="doctor")

