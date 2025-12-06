"""
Rest rule engine - enforces minimum rest hours between shifts.
"""

from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class ShiftTiming:
    """Represents a shift with timing information."""
    date: date
    shift_type: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    doctor_id: Optional[int] = None


class RestRuleEngine:
    """
    Engine for checking rest hours between shifts.
    Ensures minimum 11 hours rest between consecutive shifts.
    """
    
    DEFAULT_SHIFT_TIMES = {
        "morning": ("08:00", "16:00"),
        "afternoon": ("12:00", "20:00"),
        "evening": ("16:00", "00:00"),
        "night": ("00:00", "08:00"),
        "resus": ("08:00", "20:00"),
        "edx": ("08:00", "20:00"),
        "auc": ("08:00", "20:00"),
    }
    
    def __init__(self, min_rest_hours: int = 11):
        """
        Initialize the rest rule engine.
        
        Args:
            min_rest_hours: Minimum hours of rest required between shifts.
        """
        self.min_rest_hours = min_rest_hours
    
    def get_shift_times(self, shift_type: str) -> tuple:
        """Get start and end times for a shift type."""
        return self.DEFAULT_SHIFT_TIMES.get(shift_type.lower(), ("08:00", "16:00"))
    
    def parse_time(self, time_str: str, shift_date: date) -> datetime:
        """Parse time string to datetime."""
        hours, minutes = map(int, time_str.split(":"))
        return datetime.combine(shift_date, datetime.min.time().replace(hour=hours, minute=minutes))
    
    def calculate_rest_hours(self, shift1: ShiftTiming, shift2: ShiftTiming) -> float:
        """
        Calculate rest hours between two shifts.
        
        Args:
            shift1: First shift (earlier)
            shift2: Second shift (later)
            
        Returns:
            Hours of rest between shifts.
        """
        # Get end time of shift1
        if shift1.end_time:
            end_time = shift1.end_time
        else:
            _, end_time = self.get_shift_times(shift1.shift_type)
        
        # Get start time of shift2
        if shift2.start_time:
            start_time = shift2.start_time
        else:
            start_time, _ = self.get_shift_times(shift2.shift_type)
        
        # Parse to datetime
        end_dt = self.parse_time(end_time, shift1.date)
        start_dt = self.parse_time(start_time, shift2.date)
        
        # Handle overnight shifts (end time is next day)
        if end_time < "08:00":
            end_dt += timedelta(days=1)
        
        # Calculate difference
        diff = start_dt - end_dt
        return diff.total_seconds() / 3600
    
    def check_rest_violation(self, shifts: List[ShiftTiming]) -> List[Dict[str, Any]]:
        """
        Check for rest hour violations in a list of shifts.
        
        Args:
            shifts: List of shifts sorted by date.
            
        Returns:
            List of violations with details.
        """
        violations = []
        
        # Sort shifts by date
        sorted_shifts = sorted(shifts, key=lambda s: s.date)
        
        for i in range(len(sorted_shifts) - 1):
            current = sorted_shifts[i]
            next_shift = sorted_shifts[i + 1]
            
            # Only check consecutive days or same day
            day_diff = (next_shift.date - current.date).days
            if day_diff > 1:
                continue
            
            rest_hours = self.calculate_rest_hours(current, next_shift)
            
            if rest_hours < self.min_rest_hours:
                violations.append({
                    "type": "rest_violation",
                    "doctor_id": current.doctor_id,
                    "date1": str(current.date),
                    "shift1": current.shift_type,
                    "date2": str(next_shift.date),
                    "shift2": next_shift.shift_type,
                    "rest_hours": round(rest_hours, 1),
                    "required_hours": self.min_rest_hours,
                    "message": f"Only {rest_hours:.1f}h rest between {current.shift_type} on {current.date} and {next_shift.shift_type} on {next_shift.date}. Minimum {self.min_rest_hours}h required."
                })
        
        return violations
    
    def is_back_to_back_night(self, shift1: ShiftTiming, shift2: ShiftTiming) -> bool:
        """Check if two shifts are back-to-back night shifts."""
        if shift1.shift_type.lower() != "night" or shift2.shift_type.lower() != "night":
            return False
        
        day_diff = (shift2.date - shift1.date).days
        return day_diff == 1
    
    def check_night_violations(self, shifts: List[ShiftTiming]) -> List[Dict[str, Any]]:
        """Check for back-to-back night shift violations."""
        violations = []
        night_shifts = [s for s in shifts if s.shift_type.lower() == "night"]
        sorted_nights = sorted(night_shifts, key=lambda s: s.date)
        
        for i in range(len(sorted_nights) - 1):
            if self.is_back_to_back_night(sorted_nights[i], sorted_nights[i + 1]):
                violations.append({
                    "type": "back_to_back_night",
                    "doctor_id": sorted_nights[i].doctor_id,
                    "date1": str(sorted_nights[i].date),
                    "date2": str(sorted_nights[i + 1].date),
                    "message": f"Back-to-back night shifts on {sorted_nights[i].date} and {sorted_nights[i + 1].date}"
                })
        
        return violations



