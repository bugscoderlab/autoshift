"""Swap management service."""

from typing import Tuple, List
from datetime import date
from sqlmodel import Session, select
from app.models.roster import MonthlyRoster
from app.models.doctor import Doctor
from app.rules.rest_rule import validate_rest_rule_for_swap
from app.schemas.swap import SwapRequestRequest, SwapRequestResponse
from app.exceptions import ValidationError


class SwapService:
    """Service for managing shift swaps."""
    
    def __init__(self, session: Session):
        """Initialize swap service."""
        self.session = session
    
    def request_swap(
        self,
        request: SwapRequestRequest
    ) -> SwapRequestResponse:
        """
        Process a shift swap request.
        
        Validates:
        - Both doctors exist
        - Source doctor has a shift on the date
        - Compliance rules (if validate_compliance is True)
        
        Args:
            request: Swap request
            
        Returns:
            Swap response with success status and any violations
            
        Raises:
            ValidationError: If validation fails
        """
        # Check doctors exist
        doctor_from = self.session.get(Doctor, request.doctor_id_from)
        doctor_to = self.session.get(Doctor, request.doctor_id_to)
        
        if not doctor_from:
            raise ValidationError(f"Doctor {request.doctor_id_from} not found")
        if not doctor_to:
            raise ValidationError(f"Doctor {request.doctor_id_to} not found")
        
        # Check source doctor has a shift on this date
        statement = (
            select(MonthlyRoster)
            .where(MonthlyRoster.doctor_id == request.doctor_id_from)
            .where(MonthlyRoster.date == request.date)
        )
        source_roster = self.session.exec(statement).first()
        
        if not source_roster:
            return SwapRequestResponse(
                success=False,
                message=f"Doctor {request.doctor_id_from} has no shift on {request.date}",
                violations=[],
                swap_applied=False
            )
        
        violations = []
        
        # Validate compliance if requested
        if request.validate_compliance:
            # Get existing roster entries for both doctors
            all_roster = list(self.session.exec(select(MonthlyRoster)).all())
            
            # Check rest rule for doctor_to
            is_valid, rest_violations = validate_rest_rule_for_swap(
                request.doctor_id_to,
                request.date,
                all_roster
            )
            
            if not is_valid:
                violations.extend(rest_violations)
            
            # Check rest rule for doctor_from (after swap, they'll have off day)
            # This is simplified - in production, check actual rest periods
        
        if violations:
            return SwapRequestResponse(
                success=False,
                message="Swap would violate compliance rules",
                violations=violations,
                swap_applied=False
            )
        
        # Apply swap
        if request.validate_compliance or len(violations) == 0:
            # Update roster entry
            source_roster.doctor_id = request.doctor_id_to
            self.session.add(source_roster)
            self.session.commit()
            
            return SwapRequestResponse(
                success=True,
                message=f"Swap applied: Doctor {request.doctor_id_to} now has shift on {request.date}",
                violations=[],
                swap_applied=True
            )
        else:
            return SwapRequestResponse(
                success=False,
                message="Swap not applied due to violations",
                violations=violations,
                swap_applied=False
            )

