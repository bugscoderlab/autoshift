"""Workload balancing rules for Resus, EDx, AUC."""

from typing import List, Dict, Tuple
from collections import defaultdict
from app.models.roster import MonthlyRoster
from app.models.pattern import ShiftType
from app.schemas.roster import ViolationDetail


# Target workload bands (adjust as needed)
TARGET_WORKLOAD_BANDS = {
    ShiftType.RESUS: {"min": 0.20, "max": 0.35},  # 20-35% of shifts
    ShiftType.EDX: {"min": 0.30, "max": 0.45},   # 30-45% of shifts
    ShiftType.AUC: {"min": 0.25, "max": 0.40},   # 25-40% of shifts
}


def calculate_workload_distribution(
    roster_entries: List[MonthlyRoster],
    doctor_id: int
) -> Dict[ShiftType, float]:
    """
    Calculate workload distribution for a doctor.
    
    Args:
        roster_entries: List of roster entries
        doctor_id: Doctor ID
        
    Returns:
        Dictionary mapping shift type to percentage
    """
    doctor_entries = [
        entry for entry in roster_entries
        if entry.doctor_id == doctor_id
        and entry.shift_type in [ShiftType.RESUS, ShiftType.EDX, ShiftType.AUC]
    ]
    
    if not doctor_entries:
        return {}
    
    total_shifts = len(doctor_entries)
    distribution = defaultdict(float)
    
    for entry in doctor_entries:
        distribution[entry.shift_type] += 1.0
    
    # Convert to percentages
    for shift_type in distribution:
        distribution[shift_type] = distribution[shift_type] / total_shifts
    
    return dict(distribution)


def check_workload_balance(
    roster_entries: List[MonthlyRoster],
    doctor_id: int
) -> List[ViolationDetail]:
    """
    Check if doctor's workload is balanced within target bands.
    
    Args:
        roster_entries: List of roster entries
        doctor_id: Doctor ID to check
        
    Returns:
        List of violations found
    """
    violations = []
    distribution = calculate_workload_distribution(roster_entries, doctor_id)
    
    for shift_type, percentage in distribution.items():
        if shift_type in TARGET_WORKLOAD_BANDS:
            band = TARGET_WORKLOAD_BANDS[shift_type]
            if percentage < band["min"]:
                violations.append(
                    ViolationDetail(
                        type="workload_balance",
                        description=(
                            f"Doctor {doctor_id} has insufficient {shift_type.value} shifts. "
                            f"Current: {percentage:.1%}, Required: {band['min']:.1%}-{band['max']:.1%}"
                        ),
                        doctor_id=doctor_id,
                        severity="warning"
                    )
                )
            elif percentage > band["max"]:
                violations.append(
                    ViolationDetail(
                        type="workload_balance",
                        description=(
                            f"Doctor {doctor_id} has excessive {shift_type.value} shifts. "
                            f"Current: {percentage:.1%}, Required: {band['min']:.1%}-{band['max']:.1%}"
                        ),
                        doctor_id=doctor_id,
                        severity="warning"
                    )
                )
    
    return violations


def get_monthly_workload_summary(
    roster_entries: List[MonthlyRoster]
) -> Dict[int, Dict[ShiftType, float]]:
    """
    Get workload summary for all doctors in a month.
    
    Args:
        roster_entries: List of roster entries for the month
        
    Returns:
        Dictionary mapping doctor_id to workload distribution
    """
    doctor_ids = set(entry.doctor_id for entry in roster_entries)
    summary = {}
    
    for doctor_id in doctor_ids:
        summary[doctor_id] = calculate_workload_distribution(roster_entries, doctor_id)
    
    return summary

