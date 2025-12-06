"""Monthly roster model."""

from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, Integer
from typing import Optional
from datetime import date as date_type
from enum import Enum
from app.models.pattern import ShiftType


class RosterSource(str, Enum):
    """Roster entry source enumeration."""
    AUTO = "auto"
    MANUAL = "manual"
    FIXED_PATTERN = "fixed-pattern"


class MonthlyRoster(SQLModel, table=True):
    """
    Monthly roster table.
    
    Stores all shift assignments for doctors.
    """
    __tablename__ = "monthly_roster"
    
    roster_id: Optional[int] = Field(
        default=None,
        sa_column=Column(Integer, primary_key=True, autoincrement=True)
    )
    date: date_type = Field(index=True)
    doctor_id: int = Field(foreign_key="doctor.doctor_id", index=True)
    shift_type: ShiftType = Field(index=True)
    source: RosterSource = Field(default=RosterSource.AUTO, index=True)
    
    # Relationships
    doctor: Optional["Doctor"] = Relationship(back_populates="roster_entries")

