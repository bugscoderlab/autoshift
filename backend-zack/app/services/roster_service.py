"""Roster generation and management service."""

from typing import List, Dict, Optional
from datetime import date
from calendar import monthrange
from sqlmodel import Session, select
from app.models.doctor import Doctor, DoctorCategory
from app.models.roster import MonthlyRoster, RosterSource
from app.models.leave import Leave, LeaveStatus
from app.models.request import ShiftRequest, RequestStatus
from app.models.pattern import ShiftType
from app.rules.fixed_pattern import (
    generate_fixed_pattern_roster,
    get_starting_week_for_month
)
from app.rules.proration import (
    calculate_available_days,
    get_effective_working_period
)
from app.rules.rest_rule import check_rest_rule
from app.rules.balance import check_workload_balance, get_monthly_workload_summary
from app.ai.roster_ai import generate_ai_roster_suggestions
from app.schemas.roster import ViolationDetail


class RosterService:
    """Service for roster generation and management."""
    
    def __init__(self, session: Session):
        """Initialize roster service."""
        self.session = session
    
    def generate_monthly_roster(
        self,
        year: int,
        month: int,
        use_ai: bool = True,
        replace_existing: bool = True
    ) -> tuple[List[MonthlyRoster], List[ViolationDetail], bool]:
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
            
            statement = (
                select(MonthlyRoster)
                .where(MonthlyRoster.date >= first_day)
                .where(MonthlyRoster.date <= last_day_date)
            )
            existing_entries = self.session.exec(statement).all()
            for entry in existing_entries:
                self.session.delete(entry)
            self.session.commit()
        
        # Get all active doctors
        statement = select(Doctor).where(Doctor.active == True)
        doctors = self.session.exec(statement).all()
        
        # Separate fixed and flexible doctors
        fixed_doctors = [d for d in doctors if d.category == DoctorCategory.FIXED]
        flexible_doctors = [d for d in doctors if d.category == DoctorCategory.FLEXIBLE]
        
        roster_entries = []
        
        # 1. Generate fixed pattern roster
        for doctor in fixed_doctors:
            leave_dates = self._get_approved_leave_dates(doctor.doctor_id, year, month)
            fixed_entries = generate_fixed_pattern_roster(doctor, year, month, leave_dates)
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
        
        This is a simplified implementation. In production, this would:
        - Consider FTE and proration
        - Balance workload across Resus/EDx/AUC
        - Respect 11-hour rest rule
        - Use AI for complex optimization
        
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
        
        # Process each date
        for current_date in month_dates:
            # Apply approved shift requests first
            if current_date in requests_by_date:
                for req in requests_by_date[current_date]:
                    entries.append(
                        MonthlyRoster(
                            date=current_date,
                            doctor_id=req.doctor_id,
                            shift_type=req.shift_type,
                            source=RosterSource.AUTO
                        )
                    )
            
            # TODO: Implement full flexible roster generation logic:
            # - Calculate available doctors (not on leave, within working period)
            # - Balance workload (Resus/EDx/AUC)
            # - Ensure 11-hour rest rule
            # - Use AI for optimization if enabled
            # - Consider FTE and proration
        
        # If AI is enabled, get suggestions
        if use_ai:
            existing_entries = entries.copy()
            constraints = {
                "shift_requests": len(shift_requests),
                "leave_dates": sum(len(dates) for dates in leave_map.values())
            }
            ai_suggestions = generate_ai_roster_suggestions(
                doctors,
                year,
                month,
                existing_entries,
                constraints
            )
            # TODO: Apply AI suggestions
        
        return entries
    
    def _get_approved_leave_dates(
        self,
        doctor_id: int,
        year: int,
        month: int
    ) -> List[date]:
        """Get approved leave dates for a doctor in a month."""
        statement = (
            select(Leave)
            .where(Leave.doctor_id == doctor_id)
            .where(Leave.status == LeaveStatus.APPROVED)
            .where(Leave.date >= date(year, month, 1))
            .where(Leave.date <= date(year, month, 31))  # Will be filtered by actual month length
        )
        leaves = self.session.exec(statement).all()
        return [l.date for l in leaves]
    
    def _get_approved_shift_requests(
        self,
        year: int,
        month: int
    ) -> List[ShiftRequest]:
        """Get approved shift requests for a month."""
        statement = (
            select(ShiftRequest)
            .where(ShiftRequest.status == RequestStatus.APPROVED)
            .where(ShiftRequest.date >= date(year, month, 1))
            .where(ShiftRequest.date <= date(year, month, 31))
        )
        return list(self.session.exec(statement).all())
    
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
            rest_violations = check_rest_rule(roster_entries, doctor_id)
            violations.extend(rest_violations)
            
            # Check workload balance
            balance_violations = check_workload_balance(roster_entries, doctor_id)
            violations.extend(balance_violations)
        
        return violations
    
    def repair_roster(
        self,
        year: int,
        month: int,
        use_ai: bool = True
    ) -> tuple[List[str], List[ViolationDetail], bool]:
        """
        Repair roster violations.
        
        Args:
            year: Year
            month: Month
            use_ai: Whether to use AI for repair guidance
            
        Returns:
            Tuple of (repairs_applied, remaining_violations, ai_used)
        """
        # Get current roster
        statement = (
            select(MonthlyRoster)
            .where(MonthlyRoster.date >= date(year, month, 1))
            .where(MonthlyRoster.date <= date(year, month, 31))
        )
        roster_entries = list(self.session.exec(statement).all())
        
        # Check violations
        violations = self._check_compliance(roster_entries)
        
        if not violations:
            return [], [], False
        
        repairs_applied = []
        ai_used = False
        
        # TODO: Implement repair logic
        # - Use AI to suggest repairs if enabled
        # - Apply repairs that don't create new violations
        # - Update roster entries in database
        
        if use_ai:
            ai_used = True
            # TODO: Call AI repair service
        
        # Re-check violations after repair
        remaining_violations = self._check_compliance(roster_entries)
        
        return repairs_applied, remaining_violations, ai_used
    
    def get_monthly_roster(
        self,
        year: int,
        month: int
    ) -> List[MonthlyRoster]:
        """
        Get roster entries for a specific month.
        
        Args:
            year: Year
            month: Month (1-12)
            
        Returns:
            List of roster entries for the month
        """
        first_day = date(year, month, 1)
        _, last_day = monthrange(year, month)
        last_day_date = date(year, month, last_day)
        
        statement = (
            select(MonthlyRoster)
            .where(MonthlyRoster.date >= first_day)
            .where(MonthlyRoster.date <= last_day_date)
            .order_by(MonthlyRoster.date, MonthlyRoster.doctor_id)
        )
        
        return list(self.session.exec(statement).all())

