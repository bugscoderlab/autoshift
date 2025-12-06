#!/usr/bin/env python3
"""Drop and recreate all database tables."""

import sys
from sqlmodel import SQLModel
from app.db.session import engine, get_ssl_config
from app.config import settings
from app.models import (
    Doctor,
    WeeklyFixedPattern,
    MonthlyRoster,
    Leave,
    ShiftRequest,
)


def main():
    """Drop and recreate all tables."""
    print("=" * 60)
    print("DROP AND RECREATE DATABASE TABLES")
    print("=" * 60)
    print()
    print("⚠️  WARNING: This will DELETE ALL DATA in the following tables:")
    print("  - doctor")
    print("  - weekly_fixed_pattern")
    print("  - monthly_roster")
    print("  - leave")
    print("  - shift_requests")
    print()
    
    response = input("Are you sure you want to continue? Type 'yes' to confirm: ")
    if response.lower() != 'yes':
        print("Aborted.")
        sys.exit(0)
    
    print()
    print("Dropping all tables...")
    try:
        # Drop tables in correct order to handle foreign key constraints
        # Tables that reference other tables must be dropped first
        from sqlalchemy import text
        
        with engine.begin() as conn:
            # Disable foreign key checks temporarily
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
            
            # Drop tables in reverse dependency order
            drop_order = [
                'monthly_roster',      # References doctor
                'leave',               # References doctor
                'shift_requests',      # References doctor
                'doctor',              # References weekly_fixed_pattern
                'weekly_fixed_pattern', # No dependencies
            ]
            
            for table_name in drop_order:
                try:
                    conn.execute(text(f"DROP TABLE IF EXISTS `{table_name}`"))
                    print(f"  ✓ Dropped table: {table_name}")
                except Exception as e:
                    print(f"  ⚠ Warning dropping {table_name}: {e}")
            
            # Re-enable foreign key checks
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
        
        print("✅ All tables dropped")
    except Exception as e:
        print(f"❌ Error dropping tables: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    print()
    print("Creating all tables...")
    try:
        SQLModel.metadata.create_all(engine)
        print("✅ All tables created successfully!")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    print()
    print("=" * 60)
    print("✅ Database tables have been recreated!")
    print("=" * 60)
    print()
    print("You can now run:")
    print("  python3 generate_dummy_data.py")


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

