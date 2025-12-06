"""Proration logic for flexible doctors (leave, off-days, FTE)."""

from datetime import date, timedelta
from typing import List, Tuple
from calendar import monthrange
from app.models.doctor import Doctor


def calculate_available_days(
    doctor: Doctor,
    year: int,
    month: int
) -> Tuple[int, int]:
    """
    Calculate available working days and leave/off days for a flexible doctor.
    
    Takes into account:
    - join_date and leave_date
    - FTE (Full-Time Equivalent)
    
    Args:
        doctor: Doctor object
        year: Year
        month: Month (1-12)
        
    Returns:
        Tuple of (available_working_days, available_leave_off_days)
    """
    # Get month boundaries
    first_day = date(year, month, 1)
    _, last_day_num = monthrange(year, month)
    last_day = date(year, month, last_day_num)
    
    # Determine effective start and end dates
    effective_start = max(first_day, doctor.join_date)
    effective_end = last_day
    
    if doctor.leave_date:
        effective_end = min(effective_end, doctor.leave_date)
    
    # Calculate total days in month
    total_days = (effective_end - effective_start).days + 1
    
    if total_days <= 0:
        return 0, 0
    
    # Calculate working days (excluding weekends - simplified)
    # In production, might want to exclude holidays too
    working_days = 0
    current_date = effective_start
    
    while current_date <= effective_end:
        if current_date.weekday() < 5:  # Monday-Friday
            working_days += 1
        current_date += timedelta(days=1)
    
    # Apply FTE
    available_working_days = int(working_days * doctor.fte)
    
    # Calculate available leave/off days
    # Typically, doctors get a certain number of leave days per month based on FTE
    # This is a simplified calculation - adjust based on actual policy
    base_leave_days_per_month = 2.0  # Example: 2 days per month at 1.0 FTE
    available_leave_off_days = int(base_leave_days_per_month * doctor.fte)
    
    return available_working_days, available_leave_off_days


def prorate_leave_days(
    doctor: Doctor,
    year: int,
    month: int,
    requested_leave_dates: List[date]
) -> Tuple[List[date], List[str]]:
    """
    Prorate leave days based on join_date, leave_date, and FTE.
    
    Args:
        doctor: Doctor object
        year: Year
        month: Month
        requested_leave_dates: List of requested leave dates
        
    Returns:
        Tuple of (approved_leave_dates, warnings)
    """
    available_working_days, available_leave_off_days = calculate_available_days(
        doctor, year, month
    )
    
    # Filter requested dates to only those in the month
    month_start = date(year, month, 1)
    _, last_day_num = monthrange(year, month)
    month_end = date(year, month, last_day_num)
    
    valid_leave_dates = [
        d for d in requested_leave_dates
        if month_start <= d <= month_end
    ]
    
    approved_leave_dates = []
    warnings = []
    
    # Check if leave requests exceed available days
    if len(valid_leave_dates) > available_leave_off_days:
        warnings.append(
            f"Doctor {doctor.doctor_id} requested {len(valid_leave_dates)} leave days, "
            f"but only {available_leave_off_days} are available based on FTE {doctor.fte}"
        )
        # Approve up to available limit
        approved_leave_dates = valid_leave_dates[:available_leave_off_days]
    else:
        approved_leave_dates = valid_leave_dates
    
    return approved_leave_dates, warnings


def get_effective_working_period(
    doctor: Doctor,
    year: int,
    month: int
) -> Tuple[date, date]:
    """
    Get effective working period for a doctor in a given month.
    
    Args:
        doctor: Doctor object
        year: Year
        month: Month
        
    Returns:
        Tuple of (start_date, end_date)
    """
    first_day = date(year, month, 1)
    _, last_day_num = monthrange(year, month)
    last_day = date(year, month, last_day_num)
    
    effective_start = max(first_day, doctor.join_date)
    effective_end = last_day
    
    if doctor.leave_date:
        effective_end = min(effective_end, doctor.leave_date)
    
    return effective_start, effective_end

