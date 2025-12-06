"""Roster generation and management service."""

from typing import List, Dict, Optional, Tuple
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
    
    def generate_monthly_roster(
        self,
        year: int,
        month: int,
        use_ai: bool = True,
        replace_existing: bool = True
    ) -> Tuple[List[MonthlyRoster], List[ViolationDetail], bool]:
        """
        Generate monthly roster for all doctors.
        
        Args:
            year: Year
            month: Month (1-12)
            use_ai: Whether to use AI for complex reasoning
            replace_existing: If True, delete existing entries for this month before generating
            
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
        flexible_entries = self._generate_flexible_roster(
            flexible_doctors,
            year,
            month,
            shift_requests,
            flexible_leave_map,
            use_ai
        )
        
        if use_ai and flexible_entries:
            ai_used = True
        
        roster_entries.extend(flexible_entries)
        
        # 3. Save all entries to database to get IDs
        for entry in roster_entries:
            self.session.add(entry)
        self.session.commit()
        
        # Refresh entries to get their IDs
        for entry in roster_entries:
            self.session.refresh(entry)
        
        # 4. Check compliance
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
    
    def _generate_flexible_roster(
        self,
        doctors: List[Doctor],
        year: int,
        month: int,
        shift_requests: List[ShiftRequest],
        leave_map: Dict[int, List[date]],
        use_ai: bool
    ) -> List[MonthlyRoster]:
        """
        Generate roster for flexible doctors.
        
        Args:
            doctors: List of flexible doctors
            year: Year
            month: Month
            shift_requests: Approved shift requests
            leave_map: Map of doctor_id to leave dates
            use_ai: Whether to use AI
            
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
        
        # Note: AI generation for flexible doctors is handled at the endpoint level
        # The service focuses on fixed patterns and approved shift requests
        # Additional AI-powered assignments can be added by the endpoint if needed
        
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

