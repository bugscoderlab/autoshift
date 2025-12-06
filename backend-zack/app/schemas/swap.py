"""Swap-related schemas."""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date


class SwapRequestRequest(BaseModel):
    """Request schema for swap request."""
    doctor_id_from: int = Field(..., description="Doctor giving up the shift")
    doctor_id_to: int = Field(..., description="Doctor taking the shift")
    date: date
    validate_compliance: bool = Field(default=True, description="Validate compliance rules")


class SwapRequestResponse(BaseModel):
    """Response schema for swap request."""
    success: bool
    message: str
    violations: List[str] = Field(default_factory=list)
    swap_applied: bool = False

