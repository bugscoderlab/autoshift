"""AI-related schemas."""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import date
from app.models.pattern import ShiftType


class AIExplainRequest(BaseModel):
    """Request schema for AI explanation."""
    violation_type: Optional[str] = None
    doctor_id: Optional[int] = None
    date: Optional[date] = None
    shift_type: Optional[ShiftType] = None
    context: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Additional context for explanation"
    )


class AIExplainResponse(BaseModel):
    """Response schema for AI explanation."""
    explanation: str
    model_used: str
    reasoning: Optional[str] = None

