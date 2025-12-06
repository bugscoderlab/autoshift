"""Weekly fixed pattern model."""

from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from enum import Enum


class ShiftType(str, Enum):
    """Shift type enumeration."""
    RESUS = "Resus"
    EDX = "EDx"
    AUC = "AUC"
    OFF = "Off"
    LEAVE = "Leave"


class WeeklyFixedPattern(SQLModel, table=True):
    """
    Weekly fixed pattern table.
    
    Defines the 4-week rotating pattern for fixed-shift doctors.
    Week numbers: 1, 2, 3, 4 (cycling)
    """
    __tablename__ = "weekly_fixed_pattern"
    
    pattern_id: Optional[int] = Field(default=None, primary_key=True)
    week_number: int = Field(ge=1, le=4, index=True)
    day_1: ShiftType = Field(default=ShiftType.OFF)
    day_2: ShiftType = Field(default=ShiftType.OFF)
    day_3: ShiftType = Field(default=ShiftType.OFF)
    day_4: ShiftType = Field(default=ShiftType.OFF)
    day_5: ShiftType = Field(default=ShiftType.OFF)
    day_6: ShiftType = Field(default=ShiftType.OFF)
    day_7: ShiftType = Field(default=ShiftType.OFF)
    
    # Relationships
    doctors: List["Doctor"] = Relationship(back_populates="weekly_pattern")

