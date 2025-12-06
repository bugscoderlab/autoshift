"""
Balance rule engine - ensures workload balancing across shift types.
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from collections import defaultdict
from datetime import date


@dataclass
class DoctorWorkload:
    """Tracks a doctor's workload across shift categories."""
    doctor_id: int
    doctor_name: str
    category: str  # fixed or flexible
    morning_count: int = 0
    evening_count: int = 0
    night_count: int = 0
    total_shifts: int = 0


class BalanceRuleEngine:
    """
    Engine for checking workload balance across doctors.
    Ensures fair distribution of all shift types.
    """
    
    # Maximum deviation from average allowed
    MAX_DEVIATION_PERCENT = 25
    
    # Flexible doctor limits
    FLEXIBLE_MAX_SHIFTS = 4
    
    def __init__(self, max_deviation_percent: int = 25, flexible_max_shifts: int = 4):
        """
        Initialize the balance rule engine.
        
        Args:
            max_deviation_percent: Maximum deviation from average workload.
            flexible_max_shifts: Maximum shifts for flexible doctors per month.
        """
        self.max_deviation_percent = max_deviation_percent
        self.flexible_max_shifts = flexible_max_shifts
    
    def calculate_workloads(
        self, 
        shifts: List[Dict[str, Any]], 
        doctors: Dict[int, Dict[str, Any]]
    ) -> Dict[int, DoctorWorkload]:
        """
        Calculate workload for each doctor.
        
        Args:
            shifts: List of shift assignments.
            doctors: Dictionary of doctor info keyed by doctor_id.
            
        Returns:
            Dictionary of DoctorWorkload keyed by doctor_id.
        """
        workloads = {}
        
        for doctor_id, doctor_info in doctors.items():
            workloads[doctor_id] = DoctorWorkload(
                doctor_id=doctor_id,
                doctor_name=doctor_info.get("name", "Unknown"),
                category=doctor_info.get("category", "flexible")
            )
        
        for shift in shifts:
            doctor_id = shift.get("doctor_id")
            shift_type = shift.get("shift_type", "").lower()
            
            if doctor_id not in workloads:
                continue
            
            wl = workloads[doctor_id]
            wl.total_shifts += 1
            
            if shift_type == "morning":
                wl.morning_count += 1
            elif shift_type == "evening":
                wl.evening_count += 1
            elif shift_type == "night":
                wl.night_count += 1
        
        return workloads
    
    def check_flexible_limits(self, workloads: Dict[int, DoctorWorkload]) -> List[Dict[str, Any]]:
        """
        Check if flexible doctors exceed their shift limits.
        
        Args:
            workloads: Dictionary of workloads.
            
        Returns:
            List of violations.
        """
        violations = []
        
        for doctor_id, wl in workloads.items():
            if wl.category == "flexible" and wl.total_shifts > self.flexible_max_shifts:
                violations.append({
                    "type": "flexible_limit_exceeded",
                    "doctor_id": doctor_id,
                    "doctor_name": wl.doctor_name,
                    "total_shifts": wl.total_shifts,
                    "max_allowed": self.flexible_max_shifts,
                    "message": f"Flexible doctor {wl.doctor_name} has {wl.total_shifts} shifts, exceeds max {self.flexible_max_shifts}"
                })
        
        return violations
    
    def check_category_balance(
        self, 
        workloads: Dict[int, DoctorWorkload], 
        category: str
    ) -> List[Dict[str, Any]]:
        """
        Check balance within a shift category (morning, evening, night).
        
        Args:
            workloads: Dictionary of workloads.
            category: Shift category to check (morning, evening, night).
            
        Returns:
            List of violations.
        """
        violations = []
        
        # Get counts for the category
        counts = []
        for doctor_id, wl in workloads.items():
            if wl.category == "flexible":  # Only check flexible doctors for balance
                count = getattr(wl, f"{category}_count", 0)
                counts.append((doctor_id, wl.doctor_name, count))
        
        if not counts:
            return violations
        
        # Calculate average
        total = sum(c[2] for c in counts)
        avg = total / len(counts) if counts else 0
        
        # Check for deviations
        for doctor_id, name, count in counts:
            if avg > 0:
                deviation = abs(count - avg) / avg * 100
                if deviation > self.max_deviation_percent and count > avg:
                    violations.append({
                        "type": f"{category}_imbalance",
                        "doctor_id": doctor_id,
                        "doctor_name": name,
                        "count": count,
                        "average": round(avg, 1),
                        "deviation_percent": round(deviation, 1),
                        "message": f"Doctor {name} has {count} {category} shifts, {deviation:.1f}% above average ({avg:.1f})"
                    })
        
        return violations
    
    def get_balance_summary(self, workloads: Dict[int, DoctorWorkload]) -> Dict[str, Any]:
        """
        Get a summary of workload balance.
        
        Args:
            workloads: Dictionary of workloads.
            
        Returns:
            Summary statistics.
        """
        flexible_workloads = [wl for wl in workloads.values() if wl.category == "flexible"]
        
        if not flexible_workloads:
            return {"message": "No flexible doctors in roster"}
        
        def calc_stats(attr: str):
            values = [getattr(wl, attr) for wl in flexible_workloads]
            return {
                "min": min(values),
                "max": max(values),
                "avg": round(sum(values) / len(values), 1),
                "total": sum(values)
            }
        
        return {
            "total_doctors": len(flexible_workloads),
            "morning": calc_stats("morning_count"),
            "evening": calc_stats("evening_count"),
            "night": calc_stats("night_count"),
            "total_shifts": calc_stats("total_shifts")
        }



