"""
Proration engine - calculates prorated leave and off days based on FTE.
"""

from datetime import date, timedelta
from typing import Dict, Any, List, Optional
from calendar import monthrange


class ProrationEngine:
    """
    Engine for calculating prorated leave and off days.
    Considers FTE, join date, and leave date.
    """
    
    # Default annual leave days
    DEFAULT_ANNUAL_LEAVE = 14
    DEFAULT_MEDICAL_LEAVE = 14
    DEFAULT_EMERGENCY_LEAVE = 5
    
    def __init__(
        self,
        annual_leave: int = 14,
        medical_leave: int = 14,
        emergency_leave: int = 5
    ):
        """
        Initialize the proration engine.
        
        Args:
            annual_leave: Default annual leave days per year.
            medical_leave: Default medical leave days per year.
            emergency_leave: Default emergency leave days per year.
        """
        self.annual_leave = annual_leave
        self.medical_leave = medical_leave
        self.emergency_leave = emergency_leave
    
    def get_working_days_in_month(self, year: int, month: int) -> int:
        """
        Get the number of working days in a month (excluding weekends).
        
        Args:
            year: Year
            month: Month (1-12)
            
        Returns:
            Number of working days.
        """
        num_days = monthrange(year, month)[1]
        working_days = 0
        
        for day in range(1, num_days + 1):
            d = date(year, month, day)
            if d.weekday() < 5:  # Monday to Friday
                working_days += 1
        
        return working_days
    
    def calculate_fte_adjusted_days(
        self,
        doctor_id: int,
        fte: float,
        join_date: date,
        leave_date: Optional[date],
        year: int,
        month: int
    ) -> Dict[str, Any]:
        """
        Calculate FTE and date-adjusted working days for a doctor.
        
        Args:
            doctor_id: Doctor ID
            fte: Full-time equivalent (0.0 - 1.0)
            join_date: Doctor's join date
            leave_date: Doctor's leave date (if any)
            year: Year
            month: Month (1-12)
            
        Returns:
            Dictionary with adjusted days information.
        """
        month_start = date(year, month, 1)
        month_end = date(year, month, monthrange(year, month)[1])
        
        # Determine effective start and end dates for this month
        effective_start = max(month_start, join_date)
        
        if leave_date:
            effective_end = min(month_end, leave_date)
        else:
            effective_end = month_end
        
        # If doctor not active this month
        if effective_start > month_end or effective_end < month_start:
            return {
                "doctor_id": doctor_id,
                "year": year,
                "month": month,
                "fte": fte,
                "active_days": 0,
                "working_days": 0,
                "adjusted_shifts": 0,
                "active": False
            }
        
        # Count active working days
        active_working_days = 0
        for day in range(1, (effective_end - effective_start).days + 2):
            current = effective_start + timedelta(days=day - 1)
            if current.weekday() < 5:  # Working day
                active_working_days += 1
        
        # Total working days in month
        total_working_days = self.get_working_days_in_month(year, month)
        
        # Calculate prorated shifts (adjusted by FTE and active period)
        proration_factor = active_working_days / total_working_days if total_working_days > 0 else 0
        adjusted_shifts = round(proration_factor * fte * 20)  # Assume ~20 shift days per month
        
        return {
            "doctor_id": doctor_id,
            "year": year,
            "month": month,
            "fte": fte,
            "active_days": (effective_end - effective_start).days + 1,
            "working_days": active_working_days,
            "total_working_days": total_working_days,
            "proration_factor": round(proration_factor, 2),
            "adjusted_shifts": adjusted_shifts,
            "active": True
        }
    
    def calculate_leave_balance(
        self,
        fte: float,
        join_date: date,
        current_date: date,
        used_annual: int = 0,
        used_medical: int = 0,
        used_emergency: int = 0
    ) -> Dict[str, int]:
        """
        Calculate remaining leave balance based on FTE and service period.
        
        Args:
            fte: Full-time equivalent
            join_date: Doctor's join date
            current_date: Current date for calculation
            used_annual: Used annual leave days
            used_medical: Used medical leave days
            used_emergency: Used emergency leave days
            
        Returns:
            Dictionary with leave balances.
        """
        # Calculate months of service
        months_of_service = (current_date.year - join_date.year) * 12 + (current_date.month - join_date.month)
        
        if months_of_service < 0:
            months_of_service = 0
        
        # Prorate annual leave (accrued monthly)
        annual_entitlement = round(self.annual_leave * fte * min(months_of_service, 12) / 12)
        medical_entitlement = round(self.medical_leave * fte)
        emergency_entitlement = round(self.emergency_leave * fte)
        
        return {
            "annual_total": annual_entitlement,
            "annual_used": used_annual,
            "annual_remaining": max(0, annual_entitlement - used_annual),
            "medical_total": medical_entitlement,
            "medical_used": used_medical,
            "medical_remaining": max(0, medical_entitlement - used_medical),
            "emergency_total": emergency_entitlement,
            "emergency_used": used_emergency,
            "emergency_remaining": max(0, emergency_entitlement - used_emergency),
        }
    
    def calculate_monthly_off_days(
        self,
        fte: float,
        year: int,
        month: int
    ) -> int:
        """
        Calculate prorated off days for a month.
        
        Args:
            fte: Full-time equivalent
            year: Year
            month: Month
            
        Returns:
            Number of off days.
        """
        num_days = monthrange(year, month)[1]
        
        # Assume 8 off days per month for FTE 1.0
        base_off_days = 8
        prorated_off = round(base_off_days / fte) if fte > 0 else num_days
        
        return min(prorated_off, num_days)



