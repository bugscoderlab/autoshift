"""Leave model."""

from sqlmodel import SQLModel, Field, Relationship
from typing import Optional
from datetime import date as date_type
from enum import Enum
from pydantic import ConfigDict


class LeaveType(str, Enum):
    """Leave type enumeration."""
    ANNUAL = "annual"
    SICK = "sick"
    PERSONAL = "personal"
    OTHER = "other"


class LeaveStatus(str, Enum):
    """Leave status enumeration."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Leave(SQLModel, table=True):
    """
    Leave table.
    
    Stores leave requests and approvals.
    """
    __tablename__ = "leave"
    
    model_config = ConfigDict(populate_by_name=True)
    
    leave_id: Optional[int] = Field(default=None, primary_key=True)
    doctor_id: int = Field(foreign_key="doctor.doctor_id", index=True)
    date: date_type = Field(index=True)
    leave_type: LeaveType = Field(default=LeaveType.ANNUAL, alias="type")
    status: LeaveStatus = Field(default=LeaveStatus.PENDING, index=True)
    
    # Relationships
    doctor: Optional["Doctor"] = Relationship(back_populates="leave_entries")

