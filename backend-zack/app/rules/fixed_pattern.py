"""Fixed pattern logic for weekly rotating schedules."""

from datetime import date, timedelta
from typing import List, Optional
from calendar import monthrange
from app.models.doctor import Doctor
from app.models.pattern import WeeklyFixedPattern, ShiftType
from app.models.roster import MonthlyRoster, RosterSource


def get_starting_week_for_month(year: int, month: int) -> int:
    """
    Calculate starting week for a month.
    Each new month advances starting week by +1 (cycle 1→2→3→4→1).
    
    Args:
        year: Year
        month: Month (1-12)
        
    Returns:
        Starting week number (1-4)
    """
    # Calculate months since a reference point (e.g., Jan 2020 = week 1)
    reference_year = 2020
    reference_month = 1
    reference_week = 1
    
    months_since_reference = (year - reference_year) * 12 + (month - reference_month)
    
    # Advance by +1 per month, cycling 1→2→3→4→1
    starting_week = ((reference_week - 1 + months_since_reference) % 4) + 1
    
    return starting_week


def get_week_number_for_date(target_date: date, starting_week: int) -> int:
    """
    Get week number (1-4) for a specific date in a month.
    
    Args:
        target_date: Target date
        starting_week: Starting week for the month
        
    Returns:
        Week number (1-4)
    """
    # Get first day of month
    first_day = date(target_date.year, target_date.month, 1)
    
    # Calculate which week of the month (0-indexed)
    days_since_start = (target_date - first_day).days
    week_of_month = days_since_start // 7
    
    # Map to 1-4 cycle
    week_number = ((starting_week - 1 + week_of_month) % 4) + 1
    
    return week_number


def generate_fixed_pattern_roster(
    doctor: Doctor,
    year: int,
    month: int,
    leave_dates: Optional[List[date]] = None
) -> List[MonthlyRoster]:
    """
    Generate roster entries for a fixed-shift doctor.
    
    Args:
        doctor: Doctor object
        year: Year
        month: Month (1-12)
        leave_dates: List of dates when doctor is on leave
        
    Returns:
        List of roster entries for the month
    """
    if not doctor.weekly_pattern:
        return []
    
    if leave_dates is None:
        leave_dates = []
    
    roster_entries = []
    starting_week = get_starting_week_for_month(year, month)
    
    # Get all dates in the month
    _, last_day = monthrange(year, month)
    
    for day in range(1, last_day + 1):
        current_date = date(year, month, day)
        
        # Skip if on leave
        if current_date in leave_dates:
            roster_entries.append(
                MonthlyRoster(
                    date=current_date,
                    doctor_id=doctor.doctor_id,
                    shift_type=ShiftType.LEAVE,
                    source=RosterSource.FIXED_PATTERN
                )
            )
            continue
        
        # Get week number for this date
        week_number = get_week_number_for_date(current_date, starting_week)
        
        # Find pattern for this week
        pattern = doctor.weekly_pattern
        if pattern.week_number != week_number:
            # In a real implementation, we'd query for the correct pattern
            # For now, assume pattern matches week_number
            continue
        
        # Get shift for this day (day_1 = Monday, day_7 = Sunday)
        weekday = current_date.weekday()  # 0 = Monday, 6 = Sunday
        shift_attr = f"day_{weekday + 1}"
        shift_type = getattr(pattern, shift_attr, ShiftType.OFF)
        
        roster_entries.append(
            MonthlyRoster(
                date=current_date,
                doctor_id=doctor.doctor_id,
                shift_type=shift_type,
                source=RosterSource.FIXED_PATTERN
            )
        )
    
    return roster_entries


def handle_fixed_pattern_with_leave(
    doctor: Doctor,
    year: int,
    month: int,
    leave_dates: List[date]
) -> List[MonthlyRoster]:
    """
    Handle fixed pattern with leave adjustments.
    Pattern changes only for leave - no proration.
    
    Args:
        doctor: Doctor object
        year: Year
        month: Month
        leave_dates: List of leave dates
        
    Returns:
        List of roster entries
    """
    return generate_fixed_pattern_roster(doctor, year, month, leave_dates)

