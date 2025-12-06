"""
Weekly fixed pattern model for fixed-shift doctors.
"""

from sqlalchemy import Column, Integer, String
from pydantic import BaseModel
from typing import Optional

from .base import Base


class WeeklyFixedPattern(Base):
    """Weekly fixed pattern database model."""
    __tablename__ = "weekly_fixed_pattern"
    
    pattern_id = Column(Integer, primary_key=True, autoincrement=True)
    week_number = Column(Integer, nullable=False)
    day_1 = Column(String(20), nullable=True)
    day_2 = Column(String(20), nullable=True)
    day_3 = Column(String(20), nullable=True)
    day_4 = Column(String(20), nullable=True)
    day_5 = Column(String(20), nullable=True)
    day_6 = Column(String(20), nullable=True)
    day_7 = Column(String(20), nullable=True)
    pattern_name = Column(String(100), default="Default Pattern")


# Pydantic schemas
class WeeklyPatternBase(BaseModel):
    """Base weekly pattern schema."""
    week_number: int
    day_1: Optional[str] = None
    day_2: Optional[str] = None
    day_3: Optional[str] = None
    day_4: Optional[str] = None
    day_5: Optional[str] = None
    day_6: Optional[str] = None
    day_7: Optional[str] = None
    pattern_name: str = "Default Pattern"


class WeeklyPatternCreate(WeeklyPatternBase):
    """Schema for creating a weekly pattern."""
    pass


class WeeklyPatternRead(WeeklyPatternBase):
    """Schema for reading a weekly pattern."""
    pattern_id: int
    
    class Config:
        from_attributes = True
