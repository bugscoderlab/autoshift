#!/usr/bin/env python3
"""Check database state and initialize if needed."""

import sys
from sqlalchemy import inspect, text, create_engine
from app.database import engine, get_ssl_config
from app.config import get_settings
from app.models.base import Base
from app.models.doctor import Doctor
from app.models.weekly_pattern import WeeklyFixedPattern
from app.models.roster import MonthlyRoster
from app.models.leave import Leave
from app.models.shift_request import ShiftRequest
from app.models.swap_request import SwapRequest

settings = get_settings()


def check_tables_exist(engine) -> bool:
    """Check if required tables exist."""
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    required_tables = [
        'doctor',
        'weekly_fixed_pattern',
        'monthly_roster',
        'leave',
        'shift_request',
        'swap_request'
    ]
    
    print("Checking database tables...")
    print(f"Existing tables: {existing_tables}")
    print()
    
    missing_tables = [t for t in required_tables if t not in existing_tables]
    
    if missing_tables:
        print(f"❌ Missing tables: {missing_tables}")
        return False
    else:
        print("✅ All required tables exist")
        return True


def check_table_structure(engine):
    """Check if doctor table has correct columns."""
    try:
        inspector = inspect(engine)
        if 'doctor' not in inspector.get_table_names():
            print("❌ Doctor table does not exist")
            return False
        
        columns = [col['name'] for col in inspector.get_columns('doctor')]
        print(f"Doctor table columns: {columns}")
        
        required_columns = [
            'doctor_id', 'name', 'category', 'join_date',
            'leave_date', 'fte', 'active', 'weekly_fixed_pattern_id'
        ]
        
        missing_columns = [c for c in required_columns if c not in columns]
        
        if missing_columns:
            print(f"❌ Missing columns in doctor table: {missing_columns}")
            return False
        else:
            print("✅ Doctor table has all required columns")
            return True
    except Exception as e:
        print(f"❌ Error checking table structure: {e}")
        return False


def drop_all_tables(engine):
    """Drop all existing tables in correct order to handle foreign keys."""
    print("Dropping all existing tables...")
    try:
        with engine.begin() as conn:
            # Disable foreign key checks temporarily (MySQL/TiDB)
            if 'mysql' in str(engine.url) or 'tidb' in str(engine.url).lower():
                conn.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
            
            # Drop tables in reverse dependency order
            drop_order = [
                'monthly_roster',      # References doctor
                'leave',               # References doctor
                'shift_request',       # References doctor
                'swap_request',        # References doctor
                'doctor',              # References weekly_fixed_pattern
                'weekly_fixed_pattern', # No dependencies
            ]
            
            for table_name in drop_order:
                try:
                    conn.execute(text(f"DROP TABLE IF EXISTS `{table_name}`"))
                    print(f"  ✓ Dropped table: {table_name}")
                except Exception as e:
                    print(f"  ⚠ Warning dropping {table_name}: {e}")
            
            # Re-enable foreign key checks (MySQL/TiDB)
            if 'mysql' in str(engine.url) or 'tidb' in str(engine.url).lower():
                conn.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
        
        print("✅ All tables dropped successfully")
        return True
    except Exception as e:
        print(f"❌ Error dropping tables: {e}")
        import traceback
        traceback.print_exc()
        return False


def init_database(drop_existing=False):
    """Initialize database schema."""
    print("=" * 60)
    print("Initializing database schema...")
    print("=" * 60)
    print()
    
    connect_args = get_ssl_config()
    
    init_engine = create_engine(
        settings.database_url,
        echo=False,
        connect_args=connect_args
    )
    
    print(f"Connecting to: {settings.db_host}")
    print(f"Database: {settings.db_name}")
    print(f"SSL enabled: {bool(connect_args.get('ssl'))}")
    print()
    
    try:
        # Drop existing tables if requested
        if drop_existing:
            if not drop_all_tables(init_engine):
                return False
            print()
        
        # Create all tables
        Base.metadata.create_all(init_engine)
        print("✅ Database tables created successfully!")
        return True
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main function."""
    print("=" * 60)
    print("Database Check and Initialization")
    print("=" * 60)
    print()
    
    try:
        # Test connection
        print("Testing database connection...")
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()
        print("✅ Database connection successful")
        print()
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print()
        print("Please check:")
        print("1. Database credentials in .env file")
        print("2. Database server is running")
        print("3. SSL configuration (DB_FORCE_SSL=true for TiDB Cloud)")
        print("4. Network connectivity")
        sys.exit(1)
    
    # Check if tables exist
    tables_exist = check_tables_exist(engine)
    print()
    
    if not tables_exist:
        print("Tables are missing. Initializing database...")
        print()
        if init_database(drop_existing=False):
            print()
            # Verify tables were created
            if check_tables_exist(engine):
                print()
                check_table_structure(engine)
                print()
                print("=" * 60)
                print("✅ Database is ready!")
                print("=" * 60)
            else:
                print("⚠️  Warning: Tables may not have been created correctly")
        else:
            print("❌ Failed to initialize database")
            sys.exit(1)
    else:
        # Check table structure
        print()
        structure_ok = check_table_structure(engine)
        if not structure_ok:
            print()
            print("⚠️  Table structure is incorrect or incomplete.")
            print("The tables need to be dropped and recreated.")
            print()
            response = input("Drop all tables and recreate? This will DELETE ALL DATA. (yes/no): ")
            if response.lower() == 'yes':
                print()
                if init_database(drop_existing=True):
                    print()
                    # Verify tables were created correctly
                    if check_tables_exist(engine):
                        print()
                        if check_table_structure(engine):
                            print()
                            print("=" * 60)
                            print("✅ Database tables recreated successfully!")
                            print("=" * 60)
                        else:
                            print("⚠️  Warning: Table structure may still be incorrect")
                    else:
                        print("⚠️  Warning: Tables may not have been created correctly")
                else:
                    print("❌ Failed to recreate database tables")
                    sys.exit(1)
            else:
                print("Aborted. Please fix the table structure manually.")
                sys.exit(1)
        else:
            print()
            print("=" * 60)
            print("✅ Database is ready!")
            print("=" * 60)


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

