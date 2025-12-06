"""Leave management service."""

from typing import List, Optional
from datetime import date
from calendar import monthrange
from sqlmodel import Session, select
from app.models.leave import Leave, LeaveStatus
from app.models.doctor import Doctor
from app.schemas.leave import LeaveCreateRequest, LeaveResponse


class LeaveService:
    """Service for managing leave requests."""
    
    def __init__(self, session: Session):
        """Initialize leave service."""
        self.session = session
    
    def create_leave(self, request: LeaveCreateRequest) -> Leave:
        """
        Create a new leave request.
        
        Args:
            request: Leave creation request
            
        Returns:
            Created leave object
        """
        leave = Leave(
            doctor_id=request.doctor_id,
            date=request.date,
            leave_type=request.type,
            status=request.status
        )
        self.session.add(leave)
        self.session.commit()
        self.session.refresh(leave)
        return leave
    
    def list_leaves(
        self,
        doctor_id: Optional[int] = None,
        year: Optional[int] = None,
        month: Optional[int] = None,
        status: Optional[LeaveStatus] = None
    ) -> List[Leave]:
        """
        List leave requests with optional filters.
        
        Args:
            doctor_id: Filter by doctor ID
            year: Filter by year
            month: Filter by month
            status: Filter by status
            
        Returns:
            List of leave objects
        """
        statement = select(Leave)
        
        if doctor_id:
            statement = statement.where(Leave.doctor_id == doctor_id)
        
        if year and month:
            month_start = date(year, month, 1)
            _, last_day = monthrange(year, month)
            month_end = date(year, month, last_day)
            statement = statement.where(
                Leave.date >= month_start,
                Leave.date <= month_end
            )
        elif year:
            year_start = date(year, 1, 1)
            year_end = date(year, 12, 31)
            statement = statement.where(
                Leave.date >= year_start,
                Leave.date <= year_end
            )
        
        if status:
            statement = statement.where(Leave.status == status)
        
        return list(self.session.exec(statement).all())
    
    def get_leave_by_id(self, leave_id: int) -> Optional[Leave]:
        """Get leave by ID."""
        return self.session.get(Leave, leave_id)
    
    def update_leave_status(
        self,
        leave_id: int,
        status: LeaveStatus
    ) -> Optional[Leave]:
        """
        Update leave status.
        
        Args:
            leave_id: Leave ID
            status: New status
            
        Returns:
            Updated leave object or None if not found
        """
        leave = self.session.get(Leave, leave_id)
        if leave:
            leave.status = status
            self.session.add(leave)
            self.session.commit()
            self.session.refresh(leave)
        return leave

