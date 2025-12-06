"""
Seed data script for development/testing.
Populates the database with sample doctors, patterns, leave requests, and swap requests.
"""

from datetime import date, timedelta, datetime
import random
from sqlmodel import Session, select
from .database import engine, create_db_and_tables
from .models.doctor import Doctor, DoctorCategory
from .models.weekly_pattern import WeeklyFixedPattern
from .models.roster import MonthlyRoster, ShiftType, RosterSource
from .models.leave import Leave, LeaveType, LeaveStatus
from .models.swap_request import SwapRequest, SwapStatus


def seed_database():
    """Seed the database with comprehensive sample data."""
    create_db_and_tables()
    
    with Session(engine) as session:
        # Check if already seeded
        existing = session.exec(select(Doctor)).first()
        if existing:
            print("Database already seeded. Re-generating roster data with new logic...")
            
            # Update doctor_id 1 name to "John Doe" if it's not already
            john_doe_doctor = session.exec(select(Doctor).where(Doctor.doctor_id == 1)).first()
            if john_doe_doctor and john_doe_doctor.name != "John Doe":
                print(f"  Updating doctor_id 1 name from '{john_doe_doctor.name}' to 'John Doe'")
                john_doe_doctor.name = "John Doe"
                john_doe_doctor.email = "john.doe@hospital.com"
                session.add(john_doe_doctor)
                session.commit()
            
            # Delete existing roster entries to regenerate with new multi-staff logic
            from .models.roster import MonthlyRoster
            existing_rosters = session.exec(select(MonthlyRoster)).all()
            for roster in existing_rosters:
                session.delete(roster)
            session.commit()
            print(f"  Deleted {len(existing_rosters)} old roster entries")
            
            # Re-seed roster with new logic
            doctors = session.exec(select(Doctor)).all()
            today = date.today()
            current_month_start = date(today.year, today.month, 1)
            
            from .models.roster import ShiftType, RosterSource
            # Only 3 shifts per day: Morning, Evening, Night
            shift_types = [ShiftType.MORNING, ShiftType.EVENING, ShiftType.NIGHT]
            roster_entries = []
            
            # Find John Doe (should be first doctor, doctor_id: 1)
            john_doe = next((d for d in doctors if d.doctor_id == 1), None)
            
            # Create roster with multiple staff per shift
            for day_offset in range(0, 28):  # 4 weeks
                shift_date = current_month_start + timedelta(days=day_offset)
                weekday = shift_date.weekday()
                
                # Decide ONCE per day if John Doe works (60% chance) and which shift
                john_doe_works_today = john_doe and random.random() < 0.6
                john_doe_shift = random.choice(shift_types) if john_doe_works_today else None
                
                for shift_type in shift_types:
                    # Each shift needs 2-3 doctors minimum
                    num_doctors = 2 if weekday >= 5 else 3  # 2 on weekends, 3 on weekdays
                    
                    # Get available doctors for this shift
                    available_doctors = [d for d in doctors if d.active]
                    other_doctors = [d for d in available_doctors if not john_doe or d.doctor_id != john_doe.doctor_id]
                    
                    selected_doctors = []
                    
                    # If this is John Doe's assigned shift for today, include him
                    if john_doe_works_today and shift_type == john_doe_shift and john_doe:
                        selected_doctors.append(john_doe)
                        # Add other doctors to fill the shift
                        num_others_needed = num_doctors - 1
                        if len(other_doctors) >= num_others_needed:
                            selected_doctors.extend(random.sample(other_doctors, num_others_needed))
                        else:
                            selected_doctors.extend(other_doctors)
                    else:
                        # John Doe not working this shift, select other doctors
                        if len(other_doctors) >= num_doctors:
                            selected_doctors = random.sample(other_doctors, num_doctors)
                        else:
                            selected_doctors = other_doctors
                    
                    # Ensure we have at least 2 doctors per shift
                    if len(selected_doctors) < 2:
                        print(f"  [WARNING] Only {len(selected_doctors)} doctor(s) for {shift_type} on {shift_date}")
                    
                    # Create roster entries for selected doctors
                    for doctor in selected_doctors:
                        roster = MonthlyRoster(
                            date=shift_date,
                            doctor_id=doctor.doctor_id,
                            shift_type=shift_type,
                            source=RosterSource.AUTO
                        )
                        session.add(roster)
                        roster_entries.append(roster)
            
            session.commit()
            print(f"  Re-created {len(roster_entries)} roster entries with multiple staff per shift")
            
            # Still try to seed leave and swap if they don't exist
            seed_leave_and_swap_data(session)
            return
        
        print("Seeding database...")
        
        # ============== Weekly Patterns ==============
        patterns = []
        
        # Pattern 1: Morning/Evening rotation Week 1
        pattern1 = WeeklyFixedPattern(
            pattern_name="Morning/Evening Week 1",
            week_number=1,
            day_1="morning",
            day_2="morning",
            day_3="evening",
            day_4="evening",
            day_5="morning",
            day_6="off",
            day_7="off"
        )
        patterns.append(pattern1)
        
        # Pattern 2: Morning/Evening rotation Week 2
        pattern2 = WeeklyFixedPattern(
            pattern_name="Morning/Evening Week 2",
            week_number=2,
            day_1="evening",
            day_2="evening",
            day_3="morning",
            day_4="morning",
            day_5="evening",
            day_6="off",
            day_7="off"
        )
        patterns.append(pattern2)
        
        # Pattern 3: Night shift pattern
        pattern3 = WeeklyFixedPattern(
            pattern_name="Night Week 1",
            week_number=1,
            day_1="night",
            day_2="off",
            day_3="night",
            day_4="off",
            day_5="night",
            day_6="off",
            day_7="off"
        )
        patterns.append(pattern3)
        
        # Pattern 4: Resus/EDx pattern
        pattern4 = WeeklyFixedPattern(
            pattern_name="Resus/EDx Week 1",
            week_number=1,
            day_1="resus",
            day_2="edx",
            day_3="resus",
            day_4="edx",
            day_5="auc",
            day_6="off",
            day_7="off"
        )
        patterns.append(pattern4)
        
        for p in patterns:
            session.add(p)
        session.commit()
        
        # Refresh to get IDs
        for p in patterns:
            session.refresh(p)
        
        print(f"  Created {len(patterns)} weekly patterns")
        
        # ============== Doctors ==============
        doctors_data = [
            # Fixed doctors (with patterns)
            {"name": "John Doe", "email": "john.doe@hospital.com", "phone": "+60 12-345 6789", "category": "fixed", "department": "Emergency", "role": "Senior Consultant", "fte": 1.0, "pattern_id": patterns[0].pattern_id},
            {"name": "Dr. Sarah Johnson", "email": "sarah.j@hospital.com", "phone": "+60 12-456 7890", "category": "fixed", "department": "ICU", "role": "Specialist", "fte": 1.0, "pattern_id": patterns[1].pattern_id},
            {"name": "Dr. Michael Chen", "email": "michael.c@hospital.com", "phone": "+60 13-567 8901", "category": "fixed", "department": "Ward A", "role": "Consultant", "fte": 1.0, "pattern_id": patterns[0].pattern_id},
            {"name": "Dr. Emily Davis", "email": "emily.d@hospital.com", "phone": "+60 14-678 9012", "category": "fixed", "department": "Surgery", "role": "Registrar", "fte": 0.8, "pattern_id": patterns[2].pattern_id},
            {"name": "Dr. James Wilson", "email": "james.w@hospital.com", "phone": "+60 15-789 0123", "category": "fixed", "department": "Emergency", "role": "Medical Officer", "fte": 1.0, "pattern_id": patterns[3].pattern_id},
            
            # Flexible doctors (no fixed patterns)
            {"name": "Dr. Lisa Brown", "email": "lisa.b@hospital.com", "phone": "+60 16-890 1234", "category": "flexible", "department": "Pediatrics", "role": "Specialist", "fte": 0.5},
            {"name": "Dr. Robert Lee", "email": "robert.l@hospital.com", "phone": "+60 17-901 2345", "category": "flexible", "department": "ICU", "role": "Locum", "fte": 0.5},
            {"name": "Dr. Amanda White", "email": "amanda.w@hospital.com", "phone": "+60 18-012 3456", "category": "flexible", "department": "Emergency", "role": "Medical Officer", "fte": 0.6},
            {"name": "Dr. David Taylor", "email": "david.t@hospital.com", "phone": "+60 19-123 4567", "category": "flexible", "department": "Ward A", "role": "Registrar", "fte": 0.5},
            {"name": "Dr. Jennifer Martinez", "email": "jennifer.m@hospital.com", "phone": "+60 11-234 5678", "category": "flexible", "department": "Surgery", "role": "Consultant", "fte": 0.4},
            
            # More fixed doctors
            {"name": "Dr. Christopher Brown", "email": "chris.b@hospital.com", "phone": "+60 11-345 6789", "category": "fixed", "department": "Emergency", "role": "Senior Consultant", "fte": 1.0, "pattern_id": patterns[0].pattern_id},
            {"name": "Dr. Michelle Wong", "email": "michelle.w@hospital.com", "phone": "+60 12-456 7890", "category": "fixed", "department": "ICU", "role": "Specialist", "fte": 1.0, "pattern_id": patterns[1].pattern_id},
            
            # More flexible doctors
            {"name": "Dr. Kevin Lim", "email": "kevin.l@hospital.com", "phone": "+60 13-567 8901", "category": "flexible", "department": "Ward A", "role": "Medical Officer", "fte": 0.5},
            {"name": "Dr. Patricia Tan", "email": "patricia.t@hospital.com", "phone": "+60 14-678 9012", "category": "flexible", "department": "Pediatrics", "role": "Registrar", "fte": 0.6},
            {"name": "Dr. Alex Wong", "email": "alex.w@hospital.com", "phone": "+60 15-789 0123", "category": "houseman", "department": "Emergency", "role": "Houseman", "fte": 1.0},
        ]
        
        doctors = []
        for d in doctors_data:
            category = DoctorCategory.FIXED if d["category"] == "fixed" else (
                DoctorCategory.HOUSEMAN if d["category"] == "houseman" else DoctorCategory.FLEXIBLE
            )
            doctor = Doctor(
                name=d["name"],
                email=d["email"],
                phone=d.get("phone"),
                category=category,
                department=d["department"],
                role=d["role"],
                join_date=date.today() - timedelta(days=365),
                fte=d.get("fte", 1.0),
                weekly_fixed_pattern_id=d.get("pattern_id"),
                active=True
            )
            session.add(doctor)
            doctors.append(doctor)
        
        session.commit()
        
        # Refresh to get IDs
        for doc in doctors:
            session.refresh(doc)
        
        print(f"  Created {len(doctors)} doctors")
        
        # ============== Roster Entries ==============
        today = date.today()
        current_month_start = date(today.year, today.month, 1)
        
        # Calculate days in current and next month
        if today.month == 12:
            next_month_start = date(today.year + 1, 1, 1)
        else:
            next_month_start = date(today.year, today.month + 1, 1)
        
        # Only 3 shifts per day: Morning, Evening, Night
        shift_types = [ShiftType.MORNING, ShiftType.EVENING, ShiftType.NIGHT]
        roster_entries = []
        
        # Create roster with multiple staff per shift
        # Ensure John Doe (doctors[0]) has max 1 shift per day
        for day_offset in range(0, 28):  # 4 weeks
            shift_date = current_month_start + timedelta(days=day_offset)
            weekday = shift_date.weekday()
            
            # Decide ONCE per day if John Doe works (60% chance) and which shift
            john_doe_works_today = random.random() < 0.6
            john_doe_shift = random.choice(shift_types) if john_doe_works_today else None
            
            for shift_type in shift_types:
                # Each shift needs 2-3 doctors minimum
                num_doctors = 2 if weekday >= 5 else 3  # 2 on weekends, 3 on weekdays
                
                # Get available doctors for this shift
                available_doctors = [d for d in doctors if d.active]
                other_doctors = [d for d in available_doctors if d.doctor_id != doctors[0].doctor_id]
                
                selected_doctors = []
                
                # If this is John Doe's assigned shift for today, include him
                if john_doe_works_today and shift_type == john_doe_shift:
                    selected_doctors.append(doctors[0])
                    # Add other doctors to fill the shift
                    num_others_needed = num_doctors - 1
                    if len(other_doctors) >= num_others_needed:
                        selected_doctors.extend(random.sample(other_doctors, num_others_needed))
                    else:
                        selected_doctors.extend(other_doctors)
                else:
                    # John Doe not working this shift, select other doctors
                    if len(other_doctors) >= num_doctors:
                        selected_doctors = random.sample(other_doctors, num_doctors)
                    else:
                        selected_doctors = other_doctors
                
                    # Ensure we have at least 2 doctors per shift
                    if len(selected_doctors) < 2:
                        print(f"  [WARNING] Only {len(selected_doctors)} doctor(s) for {shift_type} on {shift_date}")
                
                # Create roster entries for selected doctors
                for doctor in selected_doctors:
                    roster = MonthlyRoster(
                        date=shift_date,
                        doctor_id=doctor.doctor_id,
                        shift_type=shift_type,
                        source=RosterSource.AUTO
                    )
                    session.add(roster)
                    roster_entries.append(roster)
        
        session.commit()
        print(f"  Created {len(roster_entries)} roster entries")
        
        # ============== Leave Requests ==============
        leave_requests = [
            # Approved leaves
            {
                "doctor_id": doctors[0].doctor_id,  # John Doe
                "start_date": today + timedelta(days=7),
                "end_date": today + timedelta(days=9),
                "leave_type": "annual",
                "reason": "Family vacation",
                "status": "approved",
                "approved_by": doctors[1].doctor_id
            },
            {
                "doctor_id": doctors[1].doctor_id,  # Dr. Sarah Johnson
                "start_date": today + timedelta(days=14),
                "end_date": today + timedelta(days=14),
                "leave_type": "medical",
                "reason": "Doctor appointment",
                "status": "approved",
                "approved_by": doctors[0].doctor_id
            },
            # Pending leaves
            {
                "doctor_id": doctors[2].doctor_id,  # Dr. Michael Chen
                "start_date": today + timedelta(days=10),
                "end_date": today + timedelta(days=12),
                "leave_type": "annual",
                "reason": "Personal matters",
                "status": "pending"
            },
            {
                "doctor_id": doctors[3].doctor_id,  # Dr. Emily Davis
                "start_date": today + timedelta(days=5),
                "end_date": today + timedelta(days=5),
                "leave_type": "emergency",
                "reason": "Family emergency",
                "status": "pending"
            },
            {
                "doctor_id": doctors[4].doctor_id,  # Dr. James Wilson
                "start_date": today + timedelta(days=21),
                "end_date": today + timedelta(days=25),
                "leave_type": "annual",
                "reason": "Overseas trip",
                "status": "pending"
            },
            {
                "doctor_id": doctors[5].doctor_id,  # Dr. Lisa Brown
                "start_date": today + timedelta(days=3),
                "end_date": today + timedelta(days=3),
                "leave_type": "medical",
                "reason": "Not feeling well",
                "status": "pending"
            },
            # Rejected leave
            {
                "doctor_id": doctors[6].doctor_id,  # Dr. Robert Lee
                "start_date": today - timedelta(days=2),
                "end_date": today - timedelta(days=1),
                "leave_type": "annual",
                "reason": "Short notice leave",
                "status": "rejected"
            },
        ]
        
        for leave_data in leave_requests:
            leave = Leave(
                doctor_id=leave_data["doctor_id"],
                start_date=leave_data["start_date"],
                end_date=leave_data["end_date"],
                leave_type=leave_data["leave_type"],
                reason=leave_data.get("reason"),
                status=leave_data["status"],
                approved_by=leave_data.get("approved_by"),
                invite_coverage=True
            )
            session.add(leave)
        
        session.commit()
        print(f"  Created {len(leave_requests)} leave requests")
        
        # ============== Swap Requests ==============
        swap_requests = [
            # Pending swap requests
            {
                "requester_id": doctors[0].doctor_id,  # John Doe
                "requester_shift_date": today + timedelta(days=2),
                "requester_shift_type": "morning",
                "target_id": doctors[1].doctor_id,  # To Dr. Sarah Johnson
                "target_shift_date": today + timedelta(days=3),
                "target_shift_type": "evening",
                "is_broadcast": False,
                "reason": "Need to attend conference",
                "status": "pending"
            },
            {
                "requester_id": doctors[2].doctor_id,  # Dr. Michael Chen
                "requester_shift_date": today + timedelta(days=4),
                "requester_shift_type": "evening",
                "is_broadcast": True,  # Broadcast to all
                "reason": "Personal appointment",
                "status": "pending"
            },
            {
                "requester_id": doctors[3].doctor_id,  # Dr. Emily Davis
                "requester_shift_date": today + timedelta(days=5),
                "requester_shift_type": "night",
                "target_id": doctors[4].doctor_id,  # To Dr. James Wilson
                "target_shift_date": today + timedelta(days=6),
                "target_shift_type": "morning",
                "is_broadcast": False,
                "reason": "Kid's school event",
                "status": "pending"
            },
            # Accepted swap
            {
                "requester_id": doctors[5].doctor_id,  # Dr. Lisa Brown
                "requester_shift_date": today - timedelta(days=3),
                "requester_shift_type": "morning",
                "target_id": doctors[6].doctor_id,  # Dr. Robert Lee
                "target_shift_date": today - timedelta(days=2),
                "target_shift_type": "evening",
                "is_broadcast": False,
                "reason": "Medical checkup",
                "status": "accepted",
            },
            # Rejected swap
            {
                "requester_id": doctors[7].doctor_id,  # Dr. Amanda White
                "requester_shift_date": today - timedelta(days=5),
                "requester_shift_type": "evening",
                "target_id": doctors[8].doctor_id,  # Dr. David Taylor
                "is_broadcast": False,
                "reason": "Family gathering",
                "status": "rejected"
            },
            # Another pending broadcast
            {
                "requester_id": doctors[9].doctor_id,  # Dr. Jennifer Martinez
                "requester_shift_date": today + timedelta(days=7),
                "requester_shift_type": "morning",
                "is_broadcast": True,
                "reason": "Dental appointment",
                "status": "pending"
            },
        ]
        
        for swap_data in swap_requests:
            swap = SwapRequest(
                requester_id=swap_data["requester_id"],
                requester_shift_date=swap_data["requester_shift_date"],
                requester_shift_type=swap_data["requester_shift_type"],
                target_id=swap_data.get("target_id"),
                target_shift_date=swap_data.get("target_shift_date"),
                target_shift_type=swap_data.get("target_shift_type"),
                is_broadcast=swap_data.get("is_broadcast", False),
                reason=swap_data.get("reason"),
                status=swap_data["status"]
            )
            session.add(swap)
        
        session.commit()
        print(f"  Created {len(swap_requests)} swap requests")
        
        print("Database seeding complete!")


def seed_leave_and_swap_data(session: Session):
    """Seed only leave and swap data if they don't exist."""
    # Check if leave data already exists
    existing_leave = session.exec(select(Leave)).first()
    if existing_leave:
        print("  Leave data already exists. Skipping...")
        return
    
    print("Seeding leave and swap data...")
    
    # Get all doctors
    doctors = session.exec(select(Doctor)).all()
    if len(doctors) < 7:
        print("  [WARNING] Not enough doctors. Need at least 7 doctors.")
        return
    
    today = date.today()
    
    # ============== Leave Requests ==============
    leave_requests = [
        # Approved leaves
        {
            "doctor_id": doctors[0].doctor_id,
            "start_date": today + timedelta(days=7),
            "end_date": today + timedelta(days=9),
            "leave_type": "annual",
            "reason": "Family vacation",
            "status": "approved",
            "approved_by": doctors[1].doctor_id
        },
        {
            "doctor_id": doctors[1].doctor_id,
            "start_date": today + timedelta(days=14),
            "end_date": today + timedelta(days=14),
            "leave_type": "medical",
            "reason": "Doctor appointment",
            "status": "approved",
            "approved_by": doctors[0].doctor_id
        },
        # Pending leaves
        {
            "doctor_id": doctors[2].doctor_id,
            "start_date": today + timedelta(days=10),
            "end_date": today + timedelta(days=12),
            "leave_type": "annual",
            "reason": "Personal matters",
            "status": "pending"
        },
        {
            "doctor_id": doctors[3].doctor_id,
            "start_date": today + timedelta(days=5),
            "end_date": today + timedelta(days=5),
            "leave_type": "emergency",
            "reason": "Family emergency",
            "status": "pending"
        },
        {
            "doctor_id": doctors[4].doctor_id,
            "start_date": today + timedelta(days=21),
            "end_date": today + timedelta(days=25),
            "leave_type": "annual",
            "reason": "Overseas trip",
            "status": "pending"
        },
        {
            "doctor_id": doctors[5].doctor_id,
            "start_date": today + timedelta(days=3),
            "end_date": today + timedelta(days=3),
            "leave_type": "medical",
            "reason": "Not feeling well",
            "status": "pending"
        },
        # Rejected leave
        {
            "doctor_id": doctors[6].doctor_id,
            "start_date": today - timedelta(days=2),
            "end_date": today - timedelta(days=1),
            "leave_type": "annual",
            "reason": "Short notice leave",
            "status": "rejected"
        },
    ]
    
    for leave_data in leave_requests:
        leave = Leave(
            doctor_id=leave_data["doctor_id"],
            start_date=leave_data["start_date"],
            end_date=leave_data["end_date"],
            leave_type=leave_data["leave_type"],
            reason=leave_data.get("reason"),
            status=leave_data["status"],
            approved_by=leave_data.get("approved_by"),
            invite_coverage=True
        )
        session.add(leave)
    
    session.commit()
    print(f"  Created {len(leave_requests)} leave requests")
    
    # ============== Swap Requests ==============
    swap_requests = [
        {
            "requester_id": doctors[0].doctor_id,
            "requester_shift_date": today + timedelta(days=3),
            "requester_shift_type": ShiftType.MORNING,
            "target_id": doctors[1].doctor_id,
            "target_shift_date": today + timedelta(days=5),
            "target_shift_type": ShiftType.EVENING,
            "reason": "Personal appointment",
            "status": SwapStatus.PENDING
        },
        {
            "requester_id": doctors[2].doctor_id,
            "requester_shift_date": today + timedelta(days=7),
            "requester_shift_type": ShiftType.NIGHT,
            "target_id": None,
            "target_shift_date": None,
            "target_shift_type": None,
            "is_broadcast": True,
            "reason": "Family event",
            "status": SwapStatus.PENDING
        },
        {
            "requester_id": doctors[3].doctor_id,
            "requester_shift_date": today + timedelta(days=10),
            "requester_shift_type": ShiftType.MORNING,
            "target_id": doctors[4].doctor_id,
            "target_shift_date": today + timedelta(days=12),
            "target_shift_type": ShiftType.EVENING,
            "reason": "Continuing education",
            "status": SwapStatus.ACCEPTED,
            "accepted_by": doctors[4].doctor_id,
            "accepted_at": datetime.now()
        },
        {
            "requester_id": doctors[4].doctor_id,
            "requester_shift_date": today - timedelta(days=2),
            "requester_shift_type": ShiftType.EVENING,
            "target_id": doctors[5].doctor_id,
            "target_shift_date": today + timedelta(days=1),
            "target_shift_type": ShiftType.MORNING,
            "reason": "Last minute change",
            "status": SwapStatus.REJECTED
        },
        {
            "requester_id": doctors[5].doctor_id,
            "requester_shift_date": today + timedelta(days=14),
            "requester_shift_type": ShiftType.RESUS,
            "target_id": None,
            "target_shift_date": None,
            "target_shift_type": None,
            "is_broadcast": True,
            "reason": "Wedding attendance",
            "status": SwapStatus.PENDING
        },
        {
            "requester_id": doctors[6].doctor_id,
            "requester_shift_date": today + timedelta(days=20),
            "requester_shift_type": ShiftType.EDX,
            "target_id": doctors[0].doctor_id,
            "target_shift_date": today + timedelta(days=22),
            "target_shift_type": ShiftType.NIGHT,
            "reason": "Conference",
            "status": SwapStatus.PENDING
        },
    ]
    
    for swap_data in swap_requests:
        swap = SwapRequest(
            requester_id=swap_data["requester_id"],
            requester_shift_date=swap_data["requester_shift_date"],
            requester_shift_type=swap_data["requester_shift_type"],
            target_id=swap_data.get("target_id"),
            target_shift_date=swap_data.get("target_shift_date"),
            target_shift_type=swap_data.get("target_shift_type"),
            is_broadcast=swap_data.get("is_broadcast", False),
            reason=swap_data.get("reason"),
            status=swap_data["status"],
            accepted_by=swap_data.get("accepted_by"),
            accepted_at=swap_data.get("accepted_at")
        )
        session.add(swap)
    
    session.commit()
    print(f"  Created {len(swap_requests)} swap requests")
    print("Leave and swap data seeding complete!")


def reset_and_reseed():
    """Drop all data and reseed."""
    with Session(engine) as session:
        # Delete all data in order (respecting foreign keys)
        session.exec(select(SwapRequest)).delete()
        session.exec(select(Leave)).delete()
        session.exec(select(MonthlyRoster)).delete()
        session.exec(select(Doctor)).delete()
        session.exec(select(WeeklyFixedPattern)).delete()
        session.commit()
        print("All data deleted")
    
    seed_database()


if __name__ == "__main__":
    seed_database()
