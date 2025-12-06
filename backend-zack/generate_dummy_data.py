#!/usr/bin/env python3
"""Generate dummy data for testing the hospital roster system."""

import sys
from datetime import date, timedelta
from sqlmodel import Session, select
from app.db.session import engine, get_session
from app.models import (
    Doctor,
    WeeklyFixedPattern,
    MonthlyRoster,
    Leave,
    ShiftRequest,
)
from app.models.doctor import DoctorCategory
from app.models.pattern import ShiftType
from app.models.leave import LeaveType, LeaveStatus
from app.models.request import RequestStatus
from app.models.roster import RosterSource
from calendar import monthrange
import random


def create_fixed_doctors(session: Session, count: int = 20) -> list[Doctor]:
    """Create fixed-shift doctors with weekly patterns."""
    print(f"Creating {count} fixed-shift doctors...")
    
    doctors = []
    for i in range(1, count + 1):
        # Create weekly pattern for this doctor
        week_number = ((i - 1) % 4) + 1
        
        pattern = WeeklyFixedPattern(
            week_number=week_number,
            day_1=ShiftType.RESUS if i % 2 == 0 else ShiftType.EDX,
            day_2=ShiftType.EDX if i % 2 == 0 else ShiftType.AUC,
            day_3=ShiftType.AUC,
            day_4=ShiftType.OFF,
            day_5=ShiftType.RESUS,
            day_6=ShiftType.EDX,
            day_7=ShiftType.OFF,
        )
        session.add(pattern)
        session.flush()
        
        doctor = Doctor(
            name=f"Dr. Fixed {i:02d}",
            category=DoctorCategory.FIXED,
            join_date=date(2020, 1, 1),
            fte=1.0,
            active=True,
            weekly_fixed_pattern_id=pattern.pattern_id,
        )
        session.add(doctor)
        doctors.append(doctor)
    
    session.commit()
    print(f"✅ Created {len(doctors)} fixed-shift doctors")
    return doctors


def create_flexible_doctors(session: Session, count: int = 50) -> list[Doctor]:
    """Create flexible-shift doctors."""
    print(f"Creating {count} flexible-shift doctors...")
    
    doctors = []
    for i in range(1, count + 1):
        # Vary join dates and FTE
        join_date = date(2020, 1, 1) + timedelta(days=random.randint(0, 1000))
        fte = random.choice([0.5, 0.75, 1.0])
        
        doctor = Doctor(
            name=f"Dr. Flexible {i:02d}",
            category=DoctorCategory.FLEXIBLE,
            join_date=join_date,
            fte=fte,
            active=True,
        )
        session.add(doctor)
        doctors.append(doctor)
    
    session.commit()
    print(f"✅ Created {len(doctors)} flexible-shift doctors")
    return doctors


def create_leave_entries(session: Session, doctors: list[Doctor], year: int = 2024, month: int = 1):
    """Create sample leave entries."""
    print(f"Creating leave entries for {year}-{month:02d}...")
    
    leaves = []
    _, last_day = monthrange(year, month)
    
    # Create leave for some doctors
    selected_doctors = random.sample(doctors, min(10, len(doctors)))
    
    for doctor in selected_doctors:
        # Random leave dates in the month
        leave_dates = random.sample(
            range(1, last_day + 1),
            random.randint(1, 3)
        )
        
        for day in leave_dates:
            leave = Leave(
                doctor_id=doctor.doctor_id,
                date=date(year, month, day),
                leave_type=random.choice(list(LeaveType)),
                status=LeaveStatus.APPROVED if random.random() > 0.3 else LeaveStatus.PENDING,
            )
            session.add(leave)
            leaves.append(leave)
    
    session.commit()
    print(f"✅ Created {len(leaves)} leave entries")
    return leaves


def create_shift_requests(session: Session, flexible_doctors: list[Doctor], year: int = 2024, month: int = 1):
    """Create shift requests for flexible doctors."""
    print(f"Creating shift requests for {year}-{month:02d}...")
    
    requests = []
    _, last_day = monthrange(year, month)
    
    # Each flexible doctor can have up to 4 approved requests
    for doctor in flexible_doctors[:30]:  # Limit to first 30 doctors
        num_requests = random.randint(1, 4)
        request_dates = random.sample(range(1, last_day + 1), num_requests)
        
        for day in request_dates:
            request = ShiftRequest(
                doctor_id=doctor.doctor_id,
                date=date(year, month, day),
                shift_type=random.choice([ShiftType.RESUS, ShiftType.EDX, ShiftType.AUC]),
                status=RequestStatus.APPROVED if random.random() > 0.2 else RequestStatus.PENDING,
            )
            session.add(request)
            requests.append(request)
    
    session.commit()
    print(f"✅ Created {len(requests)} shift requests")
    return requests


def create_sample_roster(session: Session, doctors: list[Doctor], year: int = 2024, month: int = 1):
    """Create sample roster entries for the month."""
    print(f"Creating sample roster entries for {year}-{month:02d}...")
    
    roster_entries = []
    _, last_day = monthrange(year, month)
    
    # Get fixed doctors
    fixed_doctors = [d for d in doctors if d.category == DoctorCategory.FIXED]
    
    # Create roster for fixed doctors (simplified - just a few entries)
    for doctor in fixed_doctors[:5]:  # Just first 5 for sample
        for day in range(1, min(8, last_day + 1)):  # First week only
            roster_entry = MonthlyRoster(
                date=date(year, month, day),
                doctor_id=doctor.doctor_id,
                shift_type=random.choice([ShiftType.RESUS, ShiftType.EDX, ShiftType.AUC]),
                source=RosterSource.FIXED_PATTERN,
            )
            session.add(roster_entry)
            roster_entries.append(roster_entry)
    
    session.commit()
    print(f"✅ Created {len(roster_entries)} sample roster entries")
    return roster_entries


def main():
    """Generate all dummy data."""
    print("=" * 60)
    print("Hospital Roster System - Dummy Data Generator")
    print("=" * 60)
    print()
    
    # Check if database has existing data
    with Session(engine) as session:
        existing_doctors = session.exec(select(Doctor)).all()
        if existing_doctors:
            response = input(f"Found {len(existing_doctors)} existing doctors. Continue anyway? (y/n): ")
            if response.lower() != 'y':
                print("Aborted.")
                return
    
    # Generate data
    with Session(engine) as session:
        # Create doctors
        fixed_doctors = create_fixed_doctors(session, count=20)
        flexible_doctors = create_flexible_doctors(session, count=50)
        all_doctors = fixed_doctors + flexible_doctors
        
        print()
        
        # Create leave entries for current month
        current_date = date.today()
        create_leave_entries(session, all_doctors, current_date.year, current_date.month)
        
        print()
        
        # Create shift requests for flexible doctors
        create_shift_requests(session, flexible_doctors, current_date.year, current_date.month)
        
        print()
        
        # Create sample roster entries
        create_sample_roster(session, all_doctors, current_date.year, current_date.month)
        
        print()
        print("=" * 60)
        print("✅ Dummy data generation complete!")
        print("=" * 60)
        print()
        print("Summary:")
        print(f"  - Fixed doctors: {len(fixed_doctors)}")
        print(f"  - Flexible doctors: {len(flexible_doctors)}")
        print(f"  - Total doctors: {len(all_doctors)}")
        print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nAborted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

