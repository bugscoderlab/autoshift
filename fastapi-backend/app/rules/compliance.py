"""
Compliance checker - aggregates all rule checks for roster validation.
"""

from datetime import date, timedelta
from typing import List, Dict, Any, Optional
from .rest_rule import RestRuleEngine, ShiftTiming
from .balance import BalanceRuleEngine, DoctorWorkload
from .fixed_pattern import FixedPatternEngine
from .proration import ProrationEngine


class ComplianceChecker:
    """
    Aggregates all rule engines for comprehensive roster compliance checking.
    Supports dynamic rules from frontend.
    """
    
    def __init__(
        self,
        min_rest_hours: int = 11,
        max_deviation_percent: int = 25,
        flexible_max_shifts: int = 4,
        min_staff_per_shift: int = 2,
        max_night_shifts: int = 4,
        max_consecutive_days: int = 6,
        max_weekly_hours: int = 48
    ):
        """
        Initialize the compliance checker with default rules.
        """
        self.min_rest_hours = min_rest_hours
        self.max_deviation_percent = max_deviation_percent
        self.flexible_max_shifts = flexible_max_shifts
        self.min_staff_per_shift = min_staff_per_shift
        self.max_night_shifts = max_night_shifts
        self.max_consecutive_days = max_consecutive_days
        self.max_weekly_hours = max_weekly_hours
        
        self.rest_engine = RestRuleEngine(min_rest_hours)
        self.balance_engine = BalanceRuleEngine(max_deviation_percent, flexible_max_shifts)
        self.fixed_engine = FixedPatternEngine()
        self.proration_engine = ProrationEngine()
    
    def check_roster_compliance(
        self,
        shifts: List[Dict[str, Any]],
        doctors: Dict[int, Dict[str, Any]],
        rules: Dict[str, int] = None
    ) -> Dict[str, Any]:
        """
        Run all compliance checks on a roster.
        
        Args:
            shifts: List of shift assignments.
            doctors: Dictionary of doctor info keyed by doctor_id.
            rules: Optional rules override from frontend:
                - min_rest_hours: Minimum hours between shifts
                - max_night_shifts: Max night shifts per week
                - max_weekly_hours: Max hours per week
                - min_staff_per_shift: Minimum staff per shift
                - max_consecutive_days: Max consecutive working days
            
        Returns:
            Compliance report with violations and summary.
        """
        # Apply custom rules if provided
        if rules:
            self.min_rest_hours = rules.get("min_rest_hours", self.min_rest_hours)
            self.max_night_shifts = rules.get("max_night_shifts", self.max_night_shifts)
            self.max_weekly_hours = rules.get("max_weekly_hours", self.max_weekly_hours)
            self.min_staff_per_shift = rules.get("min_staff_per_shift", self.min_staff_per_shift)
            self.max_consecutive_days = rules.get("max_consecutive_days", self.max_consecutive_days)
            # Update rest engine with new hours
            self.rest_engine = RestRuleEngine(self.min_rest_hours)
        
        all_violations = []
        
        # Group shifts by doctor for rest rule checking
        shifts_by_doctor: Dict[int, List[ShiftTiming]] = {}
        for shift in shifts:
            doctor_id = shift.get("doctor_id")
            if doctor_id not in shifts_by_doctor:
                shifts_by_doctor[doctor_id] = []
            
            shift_date = shift.get("date")
            if isinstance(shift_date, str):
                shift_date = date.fromisoformat(shift_date)
            
            shifts_by_doctor[doctor_id].append(ShiftTiming(
                date=shift_date,
                shift_type=shift.get("shift_type"),
                start_time=shift.get("start_time"),
                end_time=shift.get("end_time"),
                doctor_id=doctor_id
            ))
        
        # Check rest violations for each doctor
        for doctor_id, doctor_shifts in shifts_by_doctor.items():
            rest_violations = self.rest_engine.check_rest_violation(doctor_shifts)
            night_violations = self.rest_engine.check_night_violations(doctor_shifts)
            all_violations.extend(rest_violations)
            all_violations.extend(night_violations)
            
            # Check consecutive days
            consecutive_violations = self._check_consecutive_days(doctor_id, doctor_shifts, doctors)
            all_violations.extend(consecutive_violations)
            
            # Check max night shifts per week
            night_shift_violations = self._check_weekly_night_shifts(doctor_id, doctor_shifts, doctors)
            all_violations.extend(night_shift_violations)
        
        # Check workload balance
        workloads = self.balance_engine.calculate_workloads(shifts, doctors)
        flexible_violations = self.balance_engine.check_flexible_limits(workloads)
        all_violations.extend(flexible_violations)
        
        # Check balance across categories
        for category in ["resus", "edx", "auc"]:
            balance_violations = self.balance_engine.check_category_balance(workloads, category)
            all_violations.extend(balance_violations)
        
        # Check minimum staffing
        staffing_violations = self.check_minimum_staffing(shifts)
        all_violations.extend(staffing_violations)
        
        # Get balance summary
        balance_summary = self.balance_engine.get_balance_summary(workloads)
        
        # Calculate stats
        stats = self._calculate_stats(shifts, doctors, shifts_by_doctor)
        
        return {
            "is_compliant": len(all_violations) == 0,
            "total_violations": len(all_violations),
            "violations": all_violations,
            "violations_by_type": self._group_violations_by_type(all_violations),
            "balance_summary": balance_summary,
            "checked_doctors": len(doctors),
            "checked_shifts": len(shifts),
            "stats": stats,
            "rules_used": {
                "min_rest_hours": self.min_rest_hours,
                "max_night_shifts": self.max_night_shifts,
                "max_weekly_hours": self.max_weekly_hours,
                "min_staff_per_shift": self.min_staff_per_shift,
                "max_consecutive_days": self.max_consecutive_days
            }
        }
    
    def _check_consecutive_days(
        self,
        doctor_id: int,
        shifts: List[ShiftTiming],
        doctors: Dict[int, Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Check if doctor works too many consecutive days."""
        violations = []
        
        if not shifts:
            return violations
        
        # Sort shifts by date
        sorted_shifts = sorted(shifts, key=lambda x: x.date)
        
        # Track consecutive days
        consecutive = 1
        start_streak = sorted_shifts[0].date
        
        for i in range(1, len(sorted_shifts)):
            prev_date = sorted_shifts[i - 1].date
            curr_date = sorted_shifts[i].date
            
            if (curr_date - prev_date).days == 1:
                consecutive += 1
                if consecutive > self.max_consecutive_days:
                    doctor_info = doctors.get(doctor_id, {})
                    violations.append({
                        "type": "consecutive_days_exceeded",
                        "doctor_id": doctor_id,
                        "doctor_name": doctor_info.get("name", f"Doctor {doctor_id}"),
                        "consecutive_days": consecutive,
                        "max_allowed": self.max_consecutive_days,
                        "start_date": str(start_streak),
                        "end_date": str(curr_date),
                        "message": f"{doctor_info.get('name', 'Doctor')} worked {consecutive} consecutive days (max {self.max_consecutive_days})"
                    })
            else:
                consecutive = 1
                start_streak = curr_date
        
        return violations
    
    def _check_weekly_night_shifts(
        self,
        doctor_id: int,
        shifts: List[ShiftTiming],
        doctors: Dict[int, Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Check if doctor has too many night shifts per week."""
        violations = []
        
        if not shifts:
            return violations
        
        # Group shifts by week
        shifts_by_week: Dict[int, int] = {}  # week_number -> night_shift_count
        
        for shift in shifts:
            shift_type = str(shift.shift_type).lower() if shift.shift_type else ""
            if shift_type == "night":
                week_num = shift.date.isocalendar()[1]
                shifts_by_week[week_num] = shifts_by_week.get(week_num, 0) + 1
        
        # Check each week
        for week_num, count in shifts_by_week.items():
            if count > self.max_night_shifts:
                doctor_info = doctors.get(doctor_id, {})
                violations.append({
                    "type": "weekly_night_shifts_exceeded",
                    "doctor_id": doctor_id,
                    "doctor_name": doctor_info.get("name", f"Doctor {doctor_id}"),
                    "week_number": week_num,
                    "night_shifts": count,
                    "max_allowed": self.max_night_shifts,
                    "message": f"{doctor_info.get('name', 'Doctor')} has {count} night shifts in week {week_num} (max {self.max_night_shifts})"
                })
        
        return violations
    
    def check_minimum_staffing(self, shifts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Check if minimum staffing requirements are met per shift per day.
        """
        violations = []
        
        # Group by date and shift type
        staffing: Dict[str, Dict[str, int]] = {}
        
        for shift in shifts:
            shift_date = str(shift.get("date"))
            shift_type = str(shift.get("shift_type", "")).lower()
            
            if shift_type == "off":
                continue
            
            # Normalize shift types
            if shift_type in ["resus", "edx", "auc"]:
                shift_type = "morning"
            elif shift_type == "afternoon":
                shift_type = "evening"
            
            if shift_date not in staffing:
                staffing[shift_date] = {}
            
            if shift_type not in staffing[shift_date]:
                staffing[shift_date][shift_type] = 0
            
            staffing[shift_date][shift_type] += 1
        
        # Check each date and shift type for main shifts
        required_shifts = ["morning", "evening", "night"]
        
        for shift_date, shift_counts in staffing.items():
            for shift_type in required_shifts:
                count = shift_counts.get(shift_type, 0)
                if count < self.min_staff_per_shift:
                    violations.append({
                        "type": "understaffed",
                        "date": shift_date,
                        "shift_type": shift_type,
                        "current_staff": count,
                        "required_staff": self.min_staff_per_shift,
                        "message": f"{shift_type.capitalize()} shift on {shift_date} has {count} staff, needs at least {self.min_staff_per_shift}"
                    })
        
        return violations
    
    def _calculate_stats(
        self,
        shifts: List[Dict[str, Any]],
        doctors: Dict[int, Dict[str, Any]],
        shifts_by_doctor: Dict[int, List[ShiftTiming]]
    ) -> Dict[str, Any]:
        """Calculate statistics for the roster."""
        total_doctors = len(doctors)
        doctors_with_shifts = len(shifts_by_doctor)
        
        # Count shift types
        shift_type_counts = {}
        for shift in shifts:
            st = str(shift.get("shift_type", "unknown")).lower()
            shift_type_counts[st] = shift_type_counts.get(st, 0) + 1
        
        # Calculate average shifts per doctor
        total_shifts = len(shifts)
        avg_shifts = total_shifts / doctors_with_shifts if doctors_with_shifts > 0 else 0
        
        return {
            "total_doctors": total_doctors,
            "doctors_with_shifts": doctors_with_shifts,
            "total_shifts": total_shifts,
            "average_shifts_per_doctor": round(avg_shifts, 2),
            "shift_type_distribution": shift_type_counts
        }
    
    def _group_violations_by_type(self, violations: List[Dict[str, Any]]) -> Dict[str, int]:
        """Group violations by type for summary."""
        counts = {}
        for v in violations:
            v_type = v.get("type", "unknown")
            counts[v_type] = counts.get(v_type, 0) + 1
        return counts
    
    def suggest_fixes(self, violations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Suggest fixes for violations.
        """
        fixes = []
        
        for violation in violations:
            v_type = violation.get("type")
            
            if v_type == "rest_violation":
                fixes.append({
                    "violation_type": v_type,
                    "suggestion": f"Move shift on {violation.get('date2')} to a later date or assign to different doctor",
                    "priority": "high",
                    "doctor_id": violation.get("doctor_id")
                })
            
            elif v_type == "back_to_back_night":
                fixes.append({
                    "violation_type": v_type,
                    "suggestion": f"Insert a rest day between {violation.get('date1')} and {violation.get('date2')} night shifts",
                    "priority": "high",
                    "doctor_id": violation.get("doctor_id")
                })
            
            elif v_type == "consecutive_days_exceeded":
                fixes.append({
                    "violation_type": v_type,
                    "suggestion": f"Give {violation.get('doctor_name')} a day off between {violation.get('start_date')} and {violation.get('end_date')}",
                    "priority": "high",
                    "doctor_id": violation.get("doctor_id")
                })
            
            elif v_type == "weekly_night_shifts_exceeded":
                fixes.append({
                    "violation_type": v_type,
                    "suggestion": f"Redistribute night shifts from {violation.get('doctor_name')} to other doctors in week {violation.get('week_number')}",
                    "priority": "medium",
                    "doctor_id": violation.get("doctor_id")
                })
            
            elif v_type == "flexible_limit_exceeded":
                fixes.append({
                    "violation_type": v_type,
                    "suggestion": f"Redistribute shifts from {violation.get('doctor_name')} to other flexible doctors",
                    "priority": "medium",
                    "doctor_id": violation.get("doctor_id")
                })
            
            elif v_type == "understaffed":
                fixes.append({
                    "violation_type": v_type,
                    "suggestion": f"Assign additional doctors to {violation.get('shift_type')} shift on {violation.get('date')}",
                    "priority": "high",
                    "date": violation.get("date"),
                    "shift_type": violation.get("shift_type")
                })
            
            elif "imbalance" in v_type:
                fixes.append({
                    "violation_type": v_type,
                    "suggestion": f"Redistribute {v_type.split('_')[0]} shifts more evenly across doctors",
                    "priority": "low"
                })
        
        # Sort by priority
        priority_order = {"high": 0, "medium": 1, "low": 2}
        fixes.sort(key=lambda x: priority_order.get(x.get("priority", "low"), 2))
        
        return fixes
