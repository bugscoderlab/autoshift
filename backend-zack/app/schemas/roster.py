"""Roster-related schemas."""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Union
from datetime import date as date_type
from app.models.pattern import ShiftType
from app.models.roster import RosterSource


class RosterGenerateRequest(BaseModel):
    """Request schema for roster generation."""
    year: int = Field(..., ge=2020, le=2100)
    month: int = Field(..., ge=1, le=12)
    use_ai: bool = Field(default=True, description="Use AI for complex reasoning")


class RosterEntry(BaseModel):
    """Single roster entry."""
    roster_id: Optional[int] = None
    date: date_type
    doctor_id: int
    doctor_name: str
    shift_type: ShiftType
    source: RosterSource


class RosterGenerateResponse(BaseModel):
    """Response schema for roster generation."""
    year: int
    month: int
    entries: List[RosterEntry]
    violations: List[str] = Field(default_factory=list)
    ai_used: bool = False


class RosterRepairRequest(BaseModel):
    """Request schema for roster repair."""
    year: int = Field(..., ge=2020, le=2100)
    month: int = Field(..., ge=1, le=12)
    use_ai: bool = Field(default=True, description="Use AI for repair guidance")


class RosterRepairResponse(BaseModel):
    """Response schema for roster repair."""
    year: int
    month: int
    repairs_applied: List[str]
    remaining_violations: List[str] = Field(default_factory=list)
    ai_used: bool = False


class RosterListResponse(BaseModel):
    """Response schema for roster list."""
    year: int
    month: int
    entries: List[RosterEntry]
    total_entries: int


class ViolationDetail(BaseModel):
    """Detailed violation information."""
    model_config = ConfigDict(extra="forbid")
    
    type: str
    description: str
    doctor_id: Optional[int] = None
    date: Optional[date_type] = None
    severity: str = "error"  # error, warning

