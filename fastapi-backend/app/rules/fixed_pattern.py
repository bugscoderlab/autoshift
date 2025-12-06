"""
Fixed pattern engine - applies weekly patterns for fixed doctors.
"""

from datetime import date, timedelta
from typing import List, Dict, Any, Optional
from calendar import monthrange


class FixedPatternEngine:
    """
    Engine for applying weekly fixed patterns to generate roster entries.
    Handles rotating start weeks across months.
    """
    
    def __init__(self):
        """Initialize the fixed pattern engine."""
        self.day_mapping = {
            0: "day_1",  # Monday
            1: "day_2",  # Tuesday
            2: "day_3",  # Wednesday
            3: "day_4",  # Thursday
            4: "day_5",  # Friday
            5: "day_6",  # Saturday
            6: "day_7",  # Sunday
        }
    
    def get_start_week_for_month(self, year: int, month: int) -> int:
        """
        Calculate the starting week number for a month.
        Rotates 1-4 based on month number.
        
        Args:
            year: Year
            month: Month (1-12)
            
        Returns:
            Starting week number (1-4)
        """
        # Simple rotation based on month
        return ((month - 1) % 4) + 1
    
    def get_week_of_month(self, d: date) -> int:
        """
        Get the week number within a month (1-5).
        
        Args:
            d: Date to check
            
        Returns:
            Week number (1-5)
        """
        first_day = d.replace(day=1)
        # Adjust for the weekday of the first day
        adjusted_day = d.day + first_day.weekday()
        return (adjusted_day - 1) // 7 + 1
    
    def get_pattern_week(self, d: date, start_week: int) -> int:
        """
        Get which pattern week (1-4) applies to a given date.
        
        Args:
            d: Date to check
            start_week: Starting week rotation
            
        Returns:
            Pattern week (1-4)
        """
        week_of_month = self.get_week_of_month(d)
        # Rotate based on start week
        pattern_week = ((week_of_month - 1 + start_week - 1) % 4) + 1
        return pattern_week
    
    def generate_fixed_roster(
        self,
        doctor_id: int,
        year: int,
        month: int,
        patterns: Dict[int, Dict[str, Optional[str]]],
        leave_dates: List[date] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate roster entries for a fixed doctor based on their weekly pattern.
        
        Args:
            doctor_id: Doctor ID
            year: Year
            month: Month (1-12)
            patterns: Dictionary of patterns keyed by week_number (1-4)
            leave_dates: List of dates when doctor is on leave
            
        Returns:
            List of roster entries.
        """
        if leave_dates is None:
            leave_dates = []
        
        roster_entries = []
        start_week = self.get_start_week_for_month(year, month)
        
        # Get all days in the month
        num_days = monthrange(year, month)[1]
        
        for day in range(1, num_days + 1):
            current_date = date(year, month, day)
            
            # Skip leave dates
            if current_date in leave_dates:
                continue
            
            # Get which pattern week applies
            pattern_week = self.get_pattern_week(current_date, start_week)
            
            # Get the pattern for this week
            if pattern_week not in patterns:
                continue
            
            pattern = patterns[pattern_week]
            
            # Get the day column (day_1 = Monday, etc.)
            weekday = current_date.weekday()
            day_key = self.day_mapping[weekday]
            
            # Get shift type for this day
            shift_type = pattern.get(day_key)
            
            if shift_type and shift_type.lower() != "off":
                roster_entries.append({
                    "date": current_date,
                    "doctor_id": doctor_id,
                    "shift_type": shift_type.lower(),
                    "source": "fixed-pattern"
                })
        
        return roster_entries
    
    def validate_pattern(self, patterns: Dict[int, Dict[str, Optional[str]]]) -> List[str]:
        """
        Validate a set of weekly patterns.
        
        Args:
            patterns: Dictionary of patterns keyed by week_number.
            
        Returns:
            List of validation errors.
        """
        errors = []
        
        valid_shifts = {"morning", "afternoon", "evening", "night", "resus", "edx", "auc", "off", None}
        
        for week_num, pattern in patterns.items():
            if week_num not in [1, 2, 3, 4]:
                errors.append(f"Invalid week number: {week_num}")
                continue
            
            for day_key in self.day_mapping.values():
                shift = pattern.get(day_key)
                if shift and shift.lower() not in valid_shifts:
                    errors.append(f"Week {week_num}, {day_key}: Invalid shift type '{shift}'")
        
        return errors



