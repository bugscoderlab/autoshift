"""Shift request management service."""

from typing import List, Optional
from datetime import date
from calendar import monthrange
from sqlmodel import Session, select, func
from app.models.request import ShiftRequest, RequestStatus
from app.models.doctor import Doctor, DoctorCategory
from app.schemas.request import ShiftRequestCreateRequest
from app.exceptions import ValidationError


class RequestService:
    """Service for managing shift requests."""
    
    MAX_CONFIRMED_REQUESTS_PER_MONTH = 4
    
    def __init__(self, session: Session):
        """Initialize request service."""
        self.session = session
    
    def create_shift_request(self, request: ShiftRequestCreateRequest) -> ShiftRequest:
        """
        Create a new shift request.
        
        Validates:
        - Doctor is flexible (not fixed)
        - Max 4 approved requests per month
        
        Args:
            request: Shift request creation request
            
        Returns:
            Created shift request object
            
        Raises:
            ValidationError: If validation fails
        """
        # Check doctor is flexible
        doctor = self.session.get(Doctor, request.doctor_id)
        if not doctor:
            raise ValidationError(f"Doctor {request.doctor_id} not found")
        
        if doctor.category != DoctorCategory.FLEXIBLE:
            raise ValidationError(
                f"Doctor {request.doctor_id} is not flexible. "
                "Only flexible doctors can make shift requests."
            )
        
        # Check max approved requests for the month
        if request.status == RequestStatus.APPROVED:
            approved_count = self._count_approved_requests(
                request.doctor_id,
                request.date.year,
                request.date.month
            )
            
            if approved_count >= self.MAX_CONFIRMED_REQUESTS_PER_MONTH:
                raise ValidationError(
                    f"Doctor {request.doctor_id} already has "
                    f"{approved_count} approved requests this month. "
                    f"Maximum is {self.MAX_CONFIRMED_REQUESTS_PER_MONTH}."
                )
        
        shift_request = ShiftRequest(
            doctor_id=request.doctor_id,
            date=request.date,
            shift_type=request.shift_type,
            status=request.status
        )
        self.session.add(shift_request)
        self.session.commit()
        self.session.refresh(shift_request)
        return shift_request
    
    def _count_approved_requests(
        self,
        doctor_id: int,
        year: int,
        month: int
    ) -> int:
        """Count approved requests for a doctor in a month."""
        month_start = date(year, month, 1)
        _, last_day = monthrange(year, month)
        month_end = date(year, month, last_day)
        
        statement = (
            select(func.count(ShiftRequest.request_id))
            .where(ShiftRequest.doctor_id == doctor_id)
            .where(ShiftRequest.status == RequestStatus.APPROVED)
            .where(ShiftRequest.date >= month_start)
            .where(ShiftRequest.date <= month_end)
        )
        
        result = self.session.exec(statement).one()
        return result or 0
    
    def list_requests(
        self,
        doctor_id: Optional[int] = None,
        year: Optional[int] = None,
        month: Optional[int] = None,
        status: Optional[RequestStatus] = None
    ) -> List[ShiftRequest]:
        """
        List shift requests with optional filters.
        
        Args:
            doctor_id: Filter by doctor ID
            year: Filter by year
            month: Filter by month
            status: Filter by status
            
        Returns:
            List of shift request objects
        """
        statement = select(ShiftRequest)
        
        if doctor_id:
            statement = statement.where(ShiftRequest.doctor_id == doctor_id)
        
        if year and month:
            month_start = date(year, month, 1)
            _, last_day = monthrange(year, month)
            month_end = date(year, month, last_day)
            statement = statement.where(
                ShiftRequest.date >= month_start,
                ShiftRequest.date <= month_end
            )
        elif year:
            year_start = date(year, 1, 1)
            year_end = date(year, 12, 31)
            statement = statement.where(
                ShiftRequest.date >= year_start,
                ShiftRequest.date <= year_end
            )
        
        if status:
            statement = statement.where(ShiftRequest.status == status)
        
        return list(self.session.exec(statement).all())
    
    def get_request_by_id(self, request_id: int) -> Optional[ShiftRequest]:
        """Get shift request by ID."""
        return self.session.get(ShiftRequest, request_id)
    
    def update_request_status(
        self,
        request_id: int,
        status: RequestStatus
    ) -> Optional[ShiftRequest]:
        """
        Update shift request status.
        
        Validates max approved requests if approving.
        
        Args:
            request_id: Request ID
            status: New status
            
        Returns:
            Updated request object or None if not found
            
        Raises:
            ValidationError: If validation fails
        """
        request = self.session.get(ShiftRequest, request_id)
        if not request:
            return None
        
        # Validate max approved requests if approving
        if status == RequestStatus.APPROVED:
            approved_count = self._count_approved_requests(
                request.doctor_id,
                request.date.year,
                request.date.month
            )
            
            # Don't count current request if it's already approved
            if request.status != RequestStatus.APPROVED:
                approved_count += 1
            
            if approved_count > self.MAX_CONFIRMED_REQUESTS_PER_MONTH:
                raise ValidationError(
                    f"Cannot approve: Doctor {request.doctor_id} would have "
                    f"{approved_count} approved requests this month. "
                    f"Maximum is {self.MAX_CONFIRMED_REQUESTS_PER_MONTH}."
                )
        
        request.status = status
        self.session.add(request)
        self.session.commit()
        self.session.refresh(request)
        return request

