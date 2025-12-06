"""
Doctor management endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Optional
from datetime import date

from ..database import get_session
from ..models.doctor import Doctor, DoctorCreate, DoctorRead, DoctorUpdate, DoctorCategory

router = APIRouter(prefix="/doctors", tags=["Doctors"])


@router.get("/", response_model=List[DoctorRead])
async def list_doctors(
    session: Session = Depends(get_session),
    category: Optional[str] = None,
    active: Optional[bool] = True,
    department: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    """
    List all doctors with optional filtering.
    
    - **category**: Filter by fixed or flexible
    - **active**: Filter by active status
    - **department**: Filter by department
    """
    query = select(Doctor)
    
    if category:
        query = query.where(Doctor.category == category)
    if active is not None:
        query = query.where(Doctor.active == active)
    if department:
        query = query.where(Doctor.department == department)
    
    query = query.offset(skip).limit(limit)
    result = session.execute(query)
    doctors = result.scalars().all()
    
    return doctors


@router.get("/{doctor_id}", response_model=DoctorRead)
async def get_doctor(
    doctor_id: int,
    session: Session = Depends(get_session)
):
    """Get a specific doctor by ID."""
    doctor = session.get(Doctor, doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor


@router.post("/", response_model=DoctorRead)
async def create_doctor(
    doctor: DoctorCreate,
    session: Session = Depends(get_session)
):
    """Create a new doctor."""
    # Check for duplicate email
    result = session.execute(select(Doctor).where(Doctor.email == doctor.email))
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_doctor = Doctor(
        name=doctor.name,
        email=doctor.email,
        phone=doctor.phone,
        category=doctor.category,
        department=doctor.department,
        role=doctor.role,
        join_date=doctor.join_date,
        leave_date=doctor.leave_date,
        fte=doctor.fte,
        active=doctor.active,
        weekly_fixed_pattern_id=doctor.weekly_fixed_pattern_id
    )
    session.add(db_doctor)
    session.commit()
    session.refresh(db_doctor)
    
    return db_doctor


@router.patch("/{doctor_id}", response_model=DoctorRead)
async def update_doctor(
    doctor_id: int,
    doctor_update: DoctorUpdate,
    session: Session = Depends(get_session)
):
    """Update a doctor."""
    doctor = session.get(Doctor, doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    update_data = doctor_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(doctor, key, value)
    
    session.add(doctor)
    session.commit()
    session.refresh(doctor)
    
    return doctor


@router.delete("/{doctor_id}")
async def delete_doctor(
    doctor_id: int,
    session: Session = Depends(get_session)
):
    """Delete a doctor (soft delete by setting active=False)."""
    doctor = session.get(Doctor, doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    doctor.active = False
    doctor.leave_date = date.today()
    session.add(doctor)
    session.commit()
    
    return {"message": "Doctor deactivated successfully"}


@router.get("/stats/summary")
async def get_doctor_stats(
    session: Session = Depends(get_session)
):
    """Get doctor statistics."""
    result = session.execute(select(Doctor))
    all_doctors = result.scalars().all()
    
    active = [d for d in all_doctors if d.active]
    fixed = [d for d in active if d.category == "fixed"]
    flexible = [d for d in active if d.category == "flexible"]
    
    departments = {}
    for d in active:
        dept = d.department or "Unknown"
        departments[dept] = departments.get(dept, 0) + 1
    
    return {
        "total": len(all_doctors),
        "active": len(active),
        "inactive": len(all_doctors) - len(active),
        "fixed": len(fixed),
        "flexible": len(flexible),
        "by_department": departments
    }
