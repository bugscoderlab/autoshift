"""
Doctor model - unified table for fixed and flexible doctors.
"""

from sqlalchemy import Column, Integer, String, Date, Float, Boolean, Enum as SQLEnum
from pydantic import BaseModel
from typing import Optional
from datetime import date
from enum import Enum

from .base import Base


class DoctorCategory(str, Enum):
    """Doctor category enum."""
    FIXED = "fixed"
    FLEXIBLE = "flexible"
    HOUSEMAN = "houseman"


class Doctor(Base):
    """Doctor database model."""
    __tablename__ = "doctor"
    
    doctor_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    category = Column(String(20), default="flexible")
    department = Column(String(100), default="General")
    role = Column(String(100), default="Medical Officer")
    join_date = Column(Date, nullable=False)
    leave_date = Column(Date, nullable=True)
    fte = Column(Float, default=1.0)
    active = Column(Boolean, default=True)
    weekly_fixed_pattern_id = Column(Integer, nullable=True)


# Pydantic schemas for validation
class DoctorBase(BaseModel):
    """Base doctor schema."""
    name: str
    email: str
    phone: Optional[str] = None
    category: str = "flexible"
    department: str = "General"
    role: str = "Medical Officer"
    join_date: date
    leave_date: Optional[date] = None
    fte: float = 1.0
    active: bool = True
    weekly_fixed_pattern_id: Optional[int] = None


class DoctorCreate(DoctorBase):
    """Schema for creating a doctor."""
    pass


class DoctorRead(DoctorBase):
    """Schema for reading a doctor."""
    doctor_id: int
    
    class Config:
        from_attributes = True


class DoctorUpdate(BaseModel):
    """Schema for updating a doctor."""
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    category: Optional[str] = None
    department: Optional[str] = None
    role: Optional[str] = None
    leave_date: Optional[date] = None
    fte: Optional[float] = None
    active: Optional[bool] = None
    weekly_fixed_pattern_id: Optional[int] = None
