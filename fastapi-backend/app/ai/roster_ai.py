"""
Roster AI - combines rule engine and AI for roster generation.
"""

from datetime import date, timedelta
from typing import Dict, Any, List, Optional
from calendar import monthrange

from .claude_client import ClaudeClient
from .groq_client import GroqClient
from ..rules.compliance import ComplianceChecker
from ..rules.fixed_pattern import FixedPatternEngine
from ..rules.proration import ProrationEngine


class RosterAI:
    """
    AI-powered roster generation and repair.
    Combines rule-based engine with AI assistance.
    """
    
    def __init__(self):
        """Initialize the Roster AI."""
        self.claude = ClaudeClient()
        self.groq = GroqClient()
        self.compliance = ComplianceChecker()
        self.fixed_pattern = FixedPatternEngine()
        self.proration = ProrationEngine()
    
    async def generate_roster(
        self,
        year: int,
        month: int,
        doctors: List[Dict[str, Any]],
        patterns: Dict[int, Dict[int, Dict[str, Any]]],
        leaves: List[Dict[str, Any]],
        shift_requests: List[Dict[str, Any]],
        rules: Dict[str, int] = None,
        use_ai: bool = True
    ) -> Dict[str, Any]:
        """
        Generate a complete monthly roster using AI and rules.
        
        Args:
            year: Year
            month: Month (1-12)
            doctors: List of doctors with their info
            patterns: Weekly patterns keyed by doctor_id then week_number
            leaves: List of approved leaves
            shift_requests: List of approved shift requests
            rules: Generation rules from frontend:
                - min_rest_hours: Minimum hours between shifts (default 11)
                - max_night_shifts: Max night shifts per week (default 4)
                - max_weekly_hours: Max hours per week (default 48)
                - min_staff_per_shift: Minimum staff per shift (default 2)
                - max_consecutive_days: Max consecutive working days (default 6)
            use_ai: Whether to use AI for optimization
            
        Returns:
            Generated roster with compliance report.
        """
        # Default rules if not provided
        if rules is None:
            rules = {
                "min_rest_hours": 11,
                "max_night_shifts": 4,
                "max_weekly_hours": 48,
                "min_staff_per_shift": 2,
                "max_consecutive_days": 6
            }
        
        roster = []
        num_days = monthrange(year, month)[1]
        
        # Parse leave dates
        leave_dates_by_doctor = self._parse_leaves(leaves)
        
        # 1. Apply fixed patterns for fixed doctors
        fixed_doctors = [d for d in doctors if d.get("category") == "fixed"]
        for doctor in fixed_doctors:
            doctor_id = doctor.get("doctor_id")
            doctor_patterns = patterns.get(doctor_id, {})
            
            if doctor_patterns:
                entries = self.fixed_pattern.generate_fixed_roster(
                    doctor_id=doctor_id,
                    year=year,
                    month=month,
                    patterns=doctor_patterns,
                    leave_dates=leave_dates_by_doctor.get(doctor_id, set())
                )
                roster.extend(entries)
        
        # 2. Apply approved shift requests
        for request in shift_requests:
            if request.get("status") == "approved":
                roster.append({
                    "date": request.get("date"),
                    "doctor_id": request.get("doctor_id"),
                    "shift_type": request.get("shift_type"),
                    "source": "request"
                })
        
        # 3. Generate shifts for flexible doctors using rules
        flexible_doctors = [d for d in doctors if d.get("category") == "flexible"]
        
        if use_ai and flexible_doctors:
            # Use AI to generate roster with rules
            ai_roster = await self._generate_with_ai(
                year=year,
                month=month,
                doctors=flexible_doctors,
                leaves=leaves,
                existing_roster=roster,
                rules=rules
            )
            roster.extend(ai_roster)
        else:
            # Rule-based assignment
            rule_based_roster = self._assign_with_rules(
                year=year,
                month=month,
                doctors=flexible_doctors,
                leave_dates_by_doctor=leave_dates_by_doctor,
                existing_roster=roster,
                rules=rules
            )
            roster.extend(rule_based_roster)
        
        # 4. Ensure minimum staffing per shift
        roster = self._ensure_minimum_staffing(
            roster=roster,
            year=year,
            month=month,
            doctors=doctors,
            leave_dates_by_doctor=leave_dates_by_doctor,
            min_staff=rules.get("min_staff_per_shift", 2)
        )
        
        # 5. Run compliance check
        doctor_dict = {d["doctor_id"]: d for d in doctors}
        compliance_report = self.compliance.check_roster_compliance(roster, doctor_dict, rules)
        
        # 6. Get fix suggestions if violations exist
        fixes = []
        if compliance_report.get("violations"):
            fixes = self.compliance.suggest_fixes(compliance_report["violations"])
        
        # Generate preview format for frontend
        preview = self._generate_preview(roster, doctor_dict, year, month)
        
        return {
            "year": year,
            "month": month,
            "roster": roster,
            "preview": preview,
            "compliance_report": compliance_report,
            "suggested_fixes": fixes,
            "total_entries": len(roster),
            "doctors_count": len(doctors),
            "rules_applied": rules,
            "is_compliant": compliance_report.get("is_compliant", True)
        }
    
    async def _generate_with_ai(
        self,
        year: int,
        month: int,
        doctors: List[Dict[str, Any]],
        leaves: List[Dict[str, Any]],
        existing_roster: List[Dict[str, Any]],
        rules: Dict[str, int]
    ) -> List[Dict[str, Any]]:
        """
        Use AI to generate roster entries following rules.
        """
        try:
            # Build AI prompt with rules
            ai_result = await self.claude.generate_roster(
                year=year,
                month=month,
                doctors=doctors,
                shift_requests=[],
                leave_list=leaves,
                existing_patterns={},
                rules=rules
            )
            
            new_entries = []
            if "roster" in ai_result:
                for entry in ai_result["roster"]:
                    # Only add if not already in roster
                    existing = any(
                        str(r.get("date")) == str(entry.get("date")) and 
                        r.get("doctor_id") == entry.get("doctor_id")
                        for r in existing_roster
                    )
                    if not existing:
                        new_entries.append(entry)
            
            return new_entries
        except Exception as e:
            # Fall back to rule-based if AI fails
            print(f"AI generation failed, using rule-based: {e}")
            leave_dates_by_doctor = self._parse_leaves(leaves)
            return self._assign_with_rules(
                year, month, doctors, leave_dates_by_doctor, existing_roster, rules
            )
    
    def _assign_with_rules(
        self,
        year: int,
        month: int,
        doctors: List[Dict[str, Any]],
        leave_dates_by_doctor: Dict[int, set],
        existing_roster: List[Dict[str, Any]],
        rules: Dict[str, int]
    ) -> List[Dict[str, Any]]:
        """
        Assign shifts using rules without AI.
        """
        new_entries = []
        num_days = monthrange(year, month)[1]
        
        # Track doctor workload
        doctor_stats = {d["doctor_id"]: {
            "shifts_this_week": 0,
            "night_shifts_this_week": 0,
            "consecutive_days": 0,
            "last_shift_date": None,
            "last_shift_type": None,
            "total_shifts": 0
        } for d in doctors}
        
        min_rest_hours = rules.get("min_rest_hours", 11)
        max_night_shifts = rules.get("max_night_shifts", 4)
        max_weekly_hours = rules.get("max_weekly_hours", 48)
        max_consecutive = rules.get("max_consecutive_days", 6)
        
        shift_types = ["morning", "evening", "night", "resus", "edx", "auc"]
        
        for day in range(1, num_days + 1):
            current_date = date(year, month, day)
            
            # Reset weekly stats on Sunday
            if current_date.weekday() == 6:
                for doctor_id in doctor_stats:
                    doctor_stats[doctor_id]["shifts_this_week"] = 0
                    doctor_stats[doctor_id]["night_shifts_this_week"] = 0
            
            for shift_type in shift_types:
                # Check if shift already assigned
                already_assigned = any(
                    str(r.get("date")) == str(current_date) and 
                    r.get("shift_type") == shift_type
                    for r in existing_roster + new_entries
                )
                
                if already_assigned:
                    continue
                
                # Find best available doctor
                best_doctor = self._find_best_doctor(
                    doctors=doctors,
                    doctor_stats=doctor_stats,
                    current_date=current_date,
                    shift_type=shift_type,
                    leave_dates_by_doctor=leave_dates_by_doctor,
                    rules=rules
                )
                
                if best_doctor:
                    doctor_id = best_doctor["doctor_id"]
                    
                    # Assign shift
                    new_entries.append({
                        "date": str(current_date),
                        "doctor_id": doctor_id,
                        "shift_type": shift_type,
                        "source": "auto",
                        "start_time": self._get_shift_start(shift_type),
                        "end_time": self._get_shift_end(shift_type)
                    })
                    
                    # Update stats
                    stats = doctor_stats[doctor_id]
                    stats["shifts_this_week"] += 1
                    stats["total_shifts"] += 1
                    if shift_type == "night":
                        stats["night_shifts_this_week"] += 1
                    
                    if stats["last_shift_date"]:
                        last_date = date.fromisoformat(stats["last_shift_date"]) if isinstance(stats["last_shift_date"], str) else stats["last_shift_date"]
                        if (current_date - last_date).days == 1:
                            stats["consecutive_days"] += 1
                        else:
                            stats["consecutive_days"] = 1
                    else:
                        stats["consecutive_days"] = 1
                    
                    stats["last_shift_date"] = str(current_date)
                    stats["last_shift_type"] = shift_type
        
        return new_entries
    
    def _find_best_doctor(
        self,
        doctors: List[Dict[str, Any]],
        doctor_stats: Dict[int, Dict],
        current_date: date,
        shift_type: str,
        leave_dates_by_doctor: Dict[int, set],
        rules: Dict[str, int]
    ) -> Optional[Dict[str, Any]]:
        """
        Find the best available doctor for a shift.
        """
        max_consecutive = rules.get("max_consecutive_days", 6)
        max_night_shifts = rules.get("max_night_shifts", 4)
        min_rest_hours = rules.get("min_rest_hours", 11)
        
        candidates = []
        
        for doctor in doctors:
            doctor_id = doctor["doctor_id"]
            stats = doctor_stats[doctor_id]
            
            # Check if on leave
            if current_date in leave_dates_by_doctor.get(doctor_id, set()):
                continue
            
            # Check consecutive days
            if stats["consecutive_days"] >= max_consecutive:
                continue
            
            # Check night shift limit
            if shift_type == "night" and stats["night_shifts_this_week"] >= max_night_shifts:
                continue
            
            # Check rest rule
            if stats["last_shift_type"] == "night" and shift_type == "morning":
                if stats["last_shift_date"]:
                    last_date = date.fromisoformat(stats["last_shift_date"]) if isinstance(stats["last_shift_date"], str) else stats["last_shift_date"]
                    if (current_date - last_date).days < 1:  # Same day or next day after night
                        continue
            
            # Calculate score (lower is better)
            score = stats["total_shifts"] + stats["shifts_this_week"]
            candidates.append((score, doctor))
        
        if not candidates:
            return None
        
        # Sort by score and return best
        candidates.sort(key=lambda x: x[0])
        return candidates[0][1]
    
    def _ensure_minimum_staffing(
        self,
        roster: List[Dict[str, Any]],
        year: int,
        month: int,
        doctors: List[Dict[str, Any]],
        leave_dates_by_doctor: Dict[int, set],
        min_staff: int
    ) -> List[Dict[str, Any]]:
        """
        Ensure minimum staffing for each shift.
        """
        num_days = monthrange(year, month)[1]
        shift_types = ["morning", "evening", "night"]
        
        for day in range(1, num_days + 1):
            current_date = date(year, month, day)
            current_date_str = str(current_date)
            
            for shift_type in shift_types:
                # Count current staff
                current_staff = [
                    r for r in roster
                    if str(r.get("date")) == current_date_str and 
                    r.get("shift_type") == shift_type
                ]
                
                needed = min_staff - len(current_staff)
                if needed <= 0:
                    continue
                
                # Find available doctors
                assigned_today = {r.get("doctor_id") for r in roster if str(r.get("date")) == current_date_str}
                
                for doctor in doctors:
                    if needed <= 0:
                        break
                    
                    doctor_id = doctor["doctor_id"]
                    if doctor_id in assigned_today:
                        continue
                    if current_date in leave_dates_by_doctor.get(doctor_id, set()):
                        continue
                    
                    roster.append({
                        "date": current_date_str,
                        "doctor_id": doctor_id,
                        "shift_type": shift_type,
                        "source": "auto-fill",
                        "start_time": self._get_shift_start(shift_type),
                        "end_time": self._get_shift_end(shift_type)
                    })
                    needed -= 1
        
        return roster
    
    def _generate_preview(
        self,
        roster: List[Dict[str, Any]],
        doctors: Dict[int, Dict[str, Any]],
        year: int,
        month: int
    ) -> List[Dict[str, Any]]:
        """
        Generate preview format for frontend.
        """
        preview = []
        num_days = monthrange(year, month)[1]
        
        # Group by date
        by_date = {}
        for entry in roster:
            date_str = str(entry.get("date"))
            if date_str not in by_date:
                by_date[date_str] = {"morning": [], "evening": [], "night": []}
            
            shift_type = entry.get("shift_type", "morning").lower()
            if shift_type in ["morning", "resus", "edx", "auc"]:
                shift_key = "morning"
            elif shift_type in ["evening", "afternoon"]:
                shift_key = "evening"
            else:
                shift_key = "night"
            
            doctor_id = entry.get("doctor_id")
            doctor = doctors.get(doctor_id, {})
            doctor_name = doctor.get("name", f"Dr. {doctor_id}")
            
            by_date[date_str][shift_key].append(doctor_name)
        
        # Convert to preview format
        for day in range(1, min(8, num_days + 1)):  # First week preview
            current_date = date(year, month, day)
            date_str = str(current_date)
            formatted_date = current_date.strftime("%a, %b %d")
            
            shifts = by_date.get(date_str, {"morning": [], "evening": [], "night": []})
            preview.append({
                "date": formatted_date,
                "morning": shifts.get("morning", []),
                "evening": shifts.get("evening", []),
                "night": shifts.get("night", [])
            })
        
        return preview
    
    def _parse_leaves(self, leaves: List[Dict[str, Any]]) -> Dict[int, set]:
        """
        Parse leaves into date sets per doctor.
        """
        leave_dates = {}
        for leave in leaves:
            doctor_id = leave.get("doctor_id")
            if doctor_id not in leave_dates:
                leave_dates[doctor_id] = set()
            
            # Handle date range
            start = leave.get("start_date") or leave.get("date")
            end = leave.get("end_date") or start
            
            if isinstance(start, str):
                start = date.fromisoformat(start)
            if isinstance(end, str):
                end = date.fromisoformat(end)
            
            if start and end:
                current = start
                while current <= end:
                    leave_dates[doctor_id].add(current)
                    current += timedelta(days=1)
            elif start:
                leave_dates[doctor_id].add(start)
        
        return leave_dates
    
    def _get_shift_start(self, shift_type: str) -> str:
        """Get shift start time."""
        mapping = {
            "morning": "08:00",
            "afternoon": "12:00",
            "evening": "16:00",
            "night": "00:00",
            "resus": "08:00",
            "edx": "08:00",
            "auc": "08:00"
        }
        return mapping.get(shift_type.lower(), "08:00")
    
    def _get_shift_end(self, shift_type: str) -> str:
        """Get shift end time."""
        mapping = {
            "morning": "16:00",
            "afternoon": "20:00",
            "evening": "00:00",
            "night": "08:00",
            "resus": "16:00",
            "edx": "16:00",
            "auc": "16:00"
        }
        return mapping.get(shift_type.lower(), "16:00")
    
    async def repair_roster(
        self,
        roster: List[Dict[str, Any]],
        doctors: Dict[int, Dict[str, Any]],
        use_ai: bool = True
    ) -> Dict[str, Any]:
        """
        Repair a roster with violations.
        """
        report = self.compliance.check_roster_compliance(roster, doctors)
        
        if report.get("is_compliant", True):
            return {
                "roster": roster,
                "repairs_made": 0,
                "compliance_report": report,
                "message": "Roster is already compliant"
            }
        
        repaired_roster = roster.copy()
        repairs_made = []
        
        if use_ai:
            try:
                ai_fixes = await self.claude.suggest_optimization(roster, report.get("violations", []))
                
                if "fixes" in ai_fixes:
                    for fix in ai_fixes["fixes"]:
                        action = fix.get("action")
                        original = fix.get("original")
                        replacement = fix.get("replacement")
                        
                        if action == "swap" and original and replacement:
                            for i, entry in enumerate(repaired_roster):
                                if (str(entry.get("date")) == str(original.get("date")) and
                                    entry.get("doctor_id") == original.get("doctor_id")):
                                    repaired_roster[i] = replacement
                                    repairs_made.append(fix)
                                    break
            except Exception as e:
                print(f"AI repair failed: {e}")
        
        new_report = self.compliance.check_roster_compliance(repaired_roster, doctors)
        
        return {
            "roster": repaired_roster,
            "repairs_made": len(repairs_made),
            "repair_details": repairs_made,
            "original_violations": report.get("total_violations", 0),
            "remaining_violations": new_report.get("total_violations", 0),
            "compliance_report": new_report
        }
