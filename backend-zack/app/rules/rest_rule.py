"""11-hour rest rule implementation."""

from datetime import timedelta
from typing import List, Dict, Tuple
from app.models.roster import MonthlyRoster
from app.models.pattern import ShiftType
from app.schemas.roster import ViolationDetail


def check_rest_rule(
    roster_entries: List[MonthlyRoster],
    doctor_id: int
) -> List[ViolationDetail]:
    """
    Check if doctor has >= 11 hours rest between shifts.
    
    Args:
        roster_entries: List of roster entries for the doctor
        doctor_id: Doctor ID to check
        
    Returns:
        List of violations found
    """
    violations = []
    
    # Filter entries for this doctor and sort by date
    doctor_entries = [
        entry for entry in roster_entries
        if entry.doctor_id == doctor_id
        and entry.shift_type not in [ShiftType.OFF, ShiftType.LEAVE]
    ]
    doctor_entries.sort(key=lambda x: x.date)
    
    # Check consecutive shifts
    for i in range(len(doctor_entries) - 1):
        current_shift = doctor_entries[i]
        next_shift = doctor_entries[i + 1]
        
        # Calculate time difference
        time_diff = next_shift.date - current_shift.date
        
        # If shifts are on consecutive days, check 11-hour rule
        if time_diff.days == 1:
            # Assume shifts end at 23:00 and start at 08:00 (adjust as needed)
            # This is a simplified check - actual implementation should use shift times
            hours_between = 24 - 15  # Simplified: 9 hours if consecutive days
            
            if hours_between < 11:
                violations.append(
                    ViolationDetail(
                        type="rest_rule",
                        description=(
                            f"Doctor {doctor_id} has insufficient rest between "
                            f"shifts on {current_shift.date} and {next_shift.date}. "
                            f"Required: 11 hours, Actual: ~{hours_between} hours"
                        ),
                        doctor_id=doctor_id,
                        date=next_shift.date,
                        severity="error"
                    )
                )
    
    return violations


def validate_rest_rule_for_swap(
    doctor_id: int,
    swap_date: date,
    existing_roster: List[MonthlyRoster]
) -> Tuple[bool, List[str]]:
    """
    Validate rest rule for a potential swap.
    
    Args:
        doctor_id: Doctor ID
        swap_date: Date of the swap
        existing_roster: Existing roster entries
        
    Returns:
        Tuple of (is_valid, list_of_violations)
    """
    # Get doctor's shifts around swap date
    relevant_entries = [
        entry for entry in existing_roster
        if entry.doctor_id == doctor_id
        and abs((entry.date - swap_date).days) <= 1
        and entry.shift_type not in [ShiftType.OFF, ShiftType.LEAVE]
    ]
    
    violations = check_rest_rule(relevant_entries + [
        MonthlyRoster(
            date=swap_date,
            doctor_id=doctor_id,
            shift_type=ShiftType.RESUS,  # Placeholder - actual shift type from swap
            source="manual"
        )
    ], doctor_id)
    
    return len(violations) == 0, [v.description for v in violations]

