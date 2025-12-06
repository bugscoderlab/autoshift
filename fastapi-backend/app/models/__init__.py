"""
Database models for the hospital roster system.
"""

from .base import Base
from .doctor import Doctor, DoctorCategory, DoctorCreate, DoctorRead, DoctorUpdate
from .weekly_pattern import WeeklyFixedPattern, WeeklyPatternCreate, WeeklyPatternRead
from .roster import MonthlyRoster, ShiftType, RosterSource, RosterCreate, RosterRead, RosterWithDoctor
from .leave import Leave, LeaveType, LeaveStatus, LeaveCreate, LeaveRead, LeaveWithDoctor
from .shift_request import ShiftRequest, RequestStatus, ShiftRequestCreate, ShiftRequestRead
from .swap_request import SwapRequest, SwapStatus, SwapRequestCreate, SwapRequestRead, SwapRequestWithDetails

__all__ = [
    "Base",
    "Doctor",
    "DoctorCategory",
    "DoctorCreate",
    "DoctorRead",
    "DoctorUpdate",
    "WeeklyFixedPattern",
    "WeeklyPatternCreate",
    "WeeklyPatternRead",
    "MonthlyRoster",
    "ShiftType",
    "RosterSource",
    "RosterCreate",
    "RosterRead",
    "RosterWithDoctor",
    "Leave",
    "LeaveType",
    "LeaveStatus",
    "LeaveCreate",
    "LeaveRead",
    "LeaveWithDoctor",
    "ShiftRequest",
    "RequestStatus",
    "ShiftRequestCreate",
    "ShiftRequestRead",
    "SwapRequest",
    "SwapStatus",
    "SwapRequestCreate",
    "SwapRequestRead",
    "SwapRequestWithDetails",
]
