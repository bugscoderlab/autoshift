"""Roster generation and management service."""

from typing import List, Dict, Optional, Tuple, Any
from datetime import date, timedelta
from calendar import monthrange
from sqlalchemy.orm import Session
from sqlalchemy import select
from ..models.doctor import Doctor, DoctorCategory
from ..models.roster import MonthlyRoster, RosterSource
from ..models.leave import Leave
from ..models.shift_request import ShiftRequest
from ..models.weekly_pattern import WeeklyFixedPattern
from ..rules.fixed_pattern import FixedPatternEngine
from ..rules.rest_rule import RestRuleEngine, ShiftTiming
from ..rules.balance import BalanceRuleEngine
from ..ai.claude_client import ClaudeClient


class ViolationDetail:
    """Violation detail for compliance checking."""
    def __init__(self, type: str, description: str, doctor_id: Optional[int] = None, 
                 date: Optional[date] = None, severity: str = "error"):
        self.type = type
        self.description = description
        self.doctor_id = doctor_id
        self.date = date
        self.severity = severity


class RosterService:
    """Service for roster generation and management."""
    
    def __init__(self, session: Session):
        """Initialize roster service."""
        self.session = session
        self.fixed_engine = FixedPatternEngine()
        self.rest_engine = RestRuleEngine()
        self.balance_engine = BalanceRuleEngine()
    
    async def generate_monthly_roster(
        self,
        year: int,
        month: int,
        use_ai: bool = True,
        replace_existing: bool = True,
        rules: Optional[Dict[str, Any]] = None
    ) -> Tuple[List[MonthlyRoster], List[ViolationDetail], bool]:
        """
        Generate monthly roster for all doctors.
        
        Args:
            year: Year
            month: Month (1-12)
            use_ai: Whether to use AI for complex reasoning
            replace_existing: If True, delete existing entries for this month before generating
            rules: Optional generation rules (min_rest_hours, max_night_shifts, etc.)
            
        Returns:
            Tuple of (roster_entries, violations, ai_used)
        """
        ai_used = False
        
        # Delete existing entries for this month if requested
        if replace_existing:
            first_day = date(year, month, 1)
            _, last_day = monthrange(year, month)
            last_day_date = date(year, month, last_day)
            
            existing_entries = self.session.execute(
                select(MonthlyRoster)
                .where(MonthlyRoster.date >= first_day)
                .where(MonthlyRoster.date <= last_day_date)
            ).scalars().all()
            
            for entry in existing_entries:
                self.session.delete(entry)
            self.session.commit()
        
        # Get all active doctors
        doctors = self.session.execute(
            select(Doctor).where(Doctor.active == True)
        ).scalars().all()
        
        # Separate fixed and flexible doctors
        fixed_doctors = [d for d in doctors if d.category == DoctorCategory.FIXED]
        flexible_doctors = [d for d in doctors if d.category == DoctorCategory.FLEXIBLE]
        
        roster_entries = []
        
        # 1. Generate fixed pattern roster
        for doctor in fixed_doctors:
            leave_dates = self._get_approved_leave_dates(doctor.doctor_id, year, month)
            fixed_entries = self._generate_fixed_roster(doctor, year, month, leave_dates)
            roster_entries.extend(fixed_entries)
        
        # 2. Generate flexible roster
        # Get approved shift requests
        shift_requests = self._get_approved_shift_requests(year, month)
        
        # Get leave dates for flexible doctors
        flexible_leave_map = {
            d.doctor_id: self._get_approved_leave_dates(d.doctor_id, year, month)
            for d in flexible_doctors
        }
        
        # Generate flexible assignments
        flexible_entries = await self._generate_flexible_roster(
            flexible_doctors,
            year,
            month,
            shift_requests,
            flexible_leave_map,
            use_ai,
            rules
        )
        
        if use_ai and flexible_entries:
            ai_used = True
        
        roster_entries.extend(flexible_entries)
        
        # 3. Ensure all shifts are filled
        roster_entries = self._ensure_all_shifts_filled(
            roster_entries,
            doctors,
            year,
            month,
            flexible_leave_map
        )
        
        # 4. Save all entries to database to get IDs
        for entry in roster_entries:
            self.session.add(entry)
        self.session.commit()
        
        # Refresh entries to get their IDs
        for entry in roster_entries:
            self.session.refresh(entry)
        
        # 5. Check compliance
        violations = self._check_compliance(roster_entries)
        
        return roster_entries, violations, ai_used
    
    def _generate_fixed_roster(
        self,
        doctor: Doctor,
        year: int,
        month: int,
        leave_dates: List[date]
    ) -> List[MonthlyRoster]:
        """Generate roster for a fixed-shift doctor."""
        if not doctor.weekly_fixed_pattern_id:
            return []
        
        # Get patterns for this doctor
        pattern_result = self.session.execute(
            select(WeeklyFixedPattern)
            .where(WeeklyFixedPattern.pattern_id == doctor.weekly_fixed_pattern_id)
        )
        patterns_list = pattern_result.scalars().all()
        
        if not patterns_list:
            return []
        
        # Build patterns dict by week_number
        patterns = {}
        for p in patterns_list:
            patterns[p.week_number] = {
                "day_1": p.day_1,
                "day_2": p.day_2,
                "day_3": p.day_3,
                "day_4": p.day_4,
                "day_5": p.day_5,
                "day_6": p.day_6,
                "day_7": p.day_7,
            }
        
        # Generate entries using fixed pattern engine
        entries_data = self.fixed_engine.generate_fixed_roster(
            doctor.doctor_id,
            year,
            month,
            patterns,
            leave_dates
        )
        
        # Convert to MonthlyRoster objects
        entries = []
        for entry_data in entries_data:
            entries.append(MonthlyRoster(
                date=entry_data["date"],
                doctor_id=entry_data["doctor_id"],
                shift_type=entry_data["shift_type"],
                source=entry_data["source"]
            ))
        
        return entries
    
    async def _generate_flexible_roster(
        self,
        doctors: List[Doctor],
        year: int,
        month: int,
        shift_requests: List[ShiftRequest],
        leave_map: Dict[int, List[date]],
        use_ai: bool,
        rules: Optional[Dict[str, Any]] = None
    ) -> List[MonthlyRoster]:
        """
        Generate roster for flexible doctors.
        
        Args:
            doctors: List of flexible doctors
            year: Year
            month: Month
            shift_requests: Approved shift requests
            leave_map: Map of doctor_id to leave dates
            use_ai: Whether to use AI (uses ClaudeClient when True)
            rules: Optional generation rules to pass to ClaudeClient
            
        Returns:
            List of roster entries
        """
        entries = []
        
        # Get all dates in month
        _, last_day = monthrange(year, month)
        month_dates = [date(year, month, d) for d in range(1, last_day + 1)]
        
        # Group shift requests by date
        requests_by_date: Dict[date, List[ShiftRequest]] = {}
        for req in shift_requests:
            if req.date not in requests_by_date:
                requests_by_date[req.date] = []
            requests_by_date[req.date].append(req)
        
        # Process each date - apply approved shift requests first
        for current_date in month_dates:
            if current_date in requests_by_date:
                for req in requests_by_date[current_date]:
                    # Check if doctor is on leave
                    if req.doctor_id in leave_map and current_date in leave_map[req.doctor_id]:
                        continue
                    
                    entries.append(MonthlyRoster(
                        date=current_date,
                        doctor_id=req.doctor_id,
                        shift_type=req.shift_type,
                        source=RosterSource.REQUEST
                    ))
        
        # Use ClaudeClient for AI generation when use_ai=True
        if use_ai and doctors:
            print(f"🤖 [RosterService] Using ClaudeClient for AI-powered roster generation ({len(doctors)} flexible doctors)")
            try:
                # Prepare data for ClaudeClient
                doctors_list = [
                    {
                        "doctor_id": d.doctor_id,
                        "name": d.name,
                        "category": d.category.value if hasattr(d.category, 'value') else str(d.category),
                        "fte": float(d.fte) if d.fte else 1.0,
                        "department": d.department
                    }
                    for d in doctors
                ]
                
                leave_list = []
                for doctor_id, leave_dates in leave_map.items():
                    for leave_date in leave_dates:
                        leave_list.append({
                            "doctor_id": doctor_id,
                            "date": str(leave_date),
                            "start_date": str(leave_date),
                            "end_date": str(leave_date)
                        })
                
                # Get existing roster entries (from fixed patterns and requests)
                existing_roster = [
                    {
                        "date": str(e.date),
                        "doctor_id": e.doctor_id,
                        "shift_type": e.shift_type
                    }
                    for e in entries
                ]
                
                # Use ClaudeClient to generate roster
                print(f"🤖 [RosterService] Calling ClaudeClient.generate_roster() for {year}-{month:02d}")
                if rules:
                    print(f"📋 [RosterService] Rules passed to ClaudeClient: {rules}")
                claude = ClaudeClient()
                ai_result = await claude.generate_roster(
                    year=year,
                    month=month,
                    doctors=doctors_list,
                    shift_requests=[],
                    leave_list=leave_list,
                    existing_patterns={},
                    rules=rules
                )
                
                # Process AI-generated roster entries
                if ai_result and "roster" in ai_result:
                    for entry_data in ai_result["roster"]:
                        # Only add entries for flexible doctors that aren't already assigned
                        doctor_id = entry_data.get("doctor_id")
                        entry_date_str = entry_data.get("date")
                        shift_type = entry_data.get("shift_type")
                        
                        if not doctor_id or not entry_date_str or not shift_type:
                            continue
                        
                        # Check if this doctor is in our flexible doctors list
                        if not any(d.doctor_id == doctor_id for d in doctors):
                            continue
                        
                        # Parse date
                        try:
                            entry_date = date.fromisoformat(entry_date_str) if isinstance(entry_date_str, str) else entry_date_str
                        except (ValueError, AttributeError):
                            continue
                        
                        # Check if doctor is on leave
                        if doctor_id in leave_map and entry_date in leave_map[doctor_id]:
                            continue
                        
                        # Check if already assigned (from shift requests)
                        already_assigned = any(
                            e.doctor_id == doctor_id and e.date == entry_date
                            for e in entries
                        )
                        
                        if not already_assigned:
                            entries.append(MonthlyRoster(
                                date=entry_date,
                                doctor_id=doctor_id,
                                shift_type=shift_type,
                                source=RosterSource.AUTO
                            ))
            except Exception as e:
                print(f"⚠️ [RosterService] AI generation failed: {e}")
                import traceback
                traceback.print_exc()
                # Continue without AI-generated entries
        
        return entries
    
    def _get_approved_leave_dates(
        self,
        doctor_id: int,
        year: int,
        month: int
    ) -> List[date]:
        """Get approved leave dates for a doctor in a month."""
        first_day = date(year, month, 1)
        _, last_day = monthrange(year, month)
        last_day_date = date(year, month, last_day)
        
        leaves = self.session.execute(
            select(Leave)
            .where(Leave.doctor_id == doctor_id)
            .where(Leave.status == "approved")
            .where(Leave.start_date <= last_day_date)
            .where(Leave.end_date >= first_day)
        ).scalars().all()
        
        # Expand leave ranges to individual dates
        leave_dates = []
        for l in leaves:
            current = max(l.start_date, first_day)
            end = min(l.end_date, last_day_date)
            while current <= end:
                leave_dates.append(current)
                current = date(current.year, current.month, current.day) + timedelta(days=1)
        
        return leave_dates
    
    def _get_approved_shift_requests(
        self,
        year: int,
        month: int
    ) -> List[ShiftRequest]:
        """Get approved shift requests for a month."""
        first_day = date(year, month, 1)
        _, last_day = monthrange(year, month)
        last_day_date = date(year, month, last_day)
        
        return self.session.execute(
            select(ShiftRequest)
            .where(ShiftRequest.status == "approved")
            .where(ShiftRequest.date >= first_day)
            .where(ShiftRequest.date <= last_day_date)
        ).scalars().all()
    
    def _ensure_all_shifts_filled(
        self,
        roster_entries: List[MonthlyRoster],
        doctors: List[Doctor],
        year: int,
        month: int,
        leave_map: Dict[int, List[date]]
    ) -> List[MonthlyRoster]:
        """
        Ensure every shift type is filled for every day of the month.
        
        Args:
            roster_entries: Current roster entries
            doctors: List of all doctors
            year: Year
            month: Month
            leave_map: Map of doctor_id to leave dates
            
        Returns:
            Updated roster entries with all shifts filled
        """
        # Get all dates in month
        _, last_day = monthrange(year, month)
        month_dates = [date(year, month, d) for d in range(1, last_day + 1)]
        
        # Valid shift types
        shift_types = ["morning", "evening", "night"]
        
        # Track which doctors are already assigned on each date
        assignments_by_date: Dict[date, Dict[str, List[int]]] = {}
        for entry in roster_entries:
            if entry.date not in assignments_by_date:
                assignments_by_date[entry.date] = {}
            if entry.shift_type not in assignments_by_date[entry.date]:
                assignments_by_date[entry.date][entry.shift_type] = []
            assignments_by_date[entry.date][entry.shift_type].append(entry.doctor_id)
        
        # Check each date and shift type
        new_entries = []
        for current_date in month_dates:
            for shift_type in shift_types:
                # Check if this shift is already filled
                assigned_doctors = assignments_by_date.get(current_date, {}).get(shift_type, [])
                
                if len(assigned_doctors) == 0:
                    # Shift is empty, need to assign a doctor
                    # Find available doctors (not on leave, not already assigned today)
                    assigned_today = set()
                    for st in shift_types:
                        assigned_today.update(assignments_by_date.get(current_date, {}).get(st, []))
                    
                    available_doctors = [
                        d for d in doctors
                        if d.active
                        and d.doctor_id not in assigned_today
                        and current_date not in leave_map.get(d.doctor_id, [])
                    ]
                    
                    if available_doctors:
                        # Assign the first available doctor
                        assigned_doctor = available_doctors[0]
                        start_time, end_time = self._get_shift_times(shift_type)
                        new_entry = MonthlyRoster(
                            date=current_date,
                            doctor_id=assigned_doctor.doctor_id,
                            shift_type=shift_type,
                            source=RosterSource.AUTO,
                            start_time=start_time,
                            end_time=end_time
                        )
                        new_entries.append(new_entry)
                        
                        # Update tracking
                        if current_date not in assignments_by_date:
                            assignments_by_date[current_date] = {}
                        if shift_type not in assignments_by_date[current_date]:
                            assignments_by_date[current_date][shift_type] = []
                        assignments_by_date[current_date][shift_type].append(assigned_doctor.doctor_id)
                        print(f"⚠️ [RosterService] Filled empty {shift_type} shift on {current_date} with doctor {assigned_doctor.doctor_id}")
                    else:
                        print(f"❌ [RosterService] WARNING: Cannot fill {shift_type} shift on {current_date} - no available doctors")
        
        # Add new entries to roster
        roster_entries.extend(new_entries)
        return roster_entries
    
    def _get_shift_times(self, shift_type: str) -> Tuple[str, str]:
        """Get start and end times for a shift type."""
        mapping = {
            "morning": ("08:00", "16:00"),
            "evening": ("16:00", "00:00"),
            "night": ("00:00", "08:00"),
        }
        return mapping.get(shift_type.lower(), ("08:00", "16:00"))
    
    def _check_compliance(
        self,
        roster_entries: List[MonthlyRoster]
    ) -> List[ViolationDetail]:
        """Check compliance rules for roster entries."""
        violations = []
        
        # Get unique doctor IDs
        doctor_ids = set(entry.doctor_id for entry in roster_entries)
        
        # Check rest rule for each doctor
        for doctor_id in doctor_ids:
            doctor_entries = [e for e in roster_entries if e.doctor_id == doctor_id]
            doctor_entries.sort(key=lambda x: x.date)
            
            # Convert to ShiftTiming objects
            shifts = [
                ShiftTiming(
                    date=e.date,
                    shift_type=e.shift_type,
                    start_time=e.start_time,
                    end_time=e.end_time,
                    doctor_id=e.doctor_id
                )
                for e in doctor_entries
            ]
            
            # Check rest violations
            rest_violations = self.rest_engine.check_rest_violation(shifts)
            for v in rest_violations:
                violations.append(ViolationDetail(
                    type="rest_rule",
                    description=v.get("message", f"Rest violation for doctor {doctor_id}"),
                    doctor_id=doctor_id,
                    date=v.get("date2"),
                    severity="error"
                ))
            
            # Check night shift violations
            night_violations = self.rest_engine.check_night_violations(shifts)
            for v in night_violations:
                violations.append(ViolationDetail(
                    type="night_shift",
                    description=v.get("message", f"Back-to-back night shifts for doctor {doctor_id}"),
                    doctor_id=doctor_id,
                    date=v.get("date2"),
                    severity="error"
                ))
        
        return violations

