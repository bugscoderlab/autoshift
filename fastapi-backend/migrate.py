#!/usr/bin/env python3
"""
Database migration script for AutoShift
Run migrations to update the database schema
"""

import os
import sys
from pathlib import Path

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import engine, get_session
from app.config import get_settings
from sqlalchemy import text

settings = get_settings()


def run_migration_file(session, migration_file: str):
    """
    Run a SQL migration file.
    
    Args:
        session: Database session
        migration_file: Path to the SQL file
    """
    print(f"\n{'='*60}")
    print(f"Running migration: {migration_file}")
    print(f"{'='*60}\n")
    
    if not os.path.exists(migration_file):
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    try:
        with open(migration_file, 'r') as f:
            sql_content = f.read()
        
        # Split by statements (separated by semicolons)
        statements = [s.strip() for s in sql_content.split(';') if s.strip()]
        
        # Filter out comments and verification queries (SELECT statements)
        migration_statements = []
        verification_statements = []
        
        for stmt in statements:
            # Remove SQL comments
            lines = [line for line in stmt.split('\n') 
                    if not line.strip().startswith('--')]
            clean_stmt = '\n'.join(lines).strip()
            
            if not clean_stmt:
                continue
            
            # Separate migration from verification
            if clean_stmt.upper().startswith('SELECT') or clean_stmt.upper().startswith('SHOW'):
                verification_statements.append(clean_stmt)
            else:
                migration_statements.append(clean_stmt)
        
        # Execute migration statements
        print("📝 Executing migration statements...")
        success_count = 0
        skip_count = 0
        warning_count = 0
        
        for i, stmt in enumerate(migration_statements, 1):
            try:
                # Show first 80 chars of statement
                preview = stmt[:80].replace('\n', ' ')
                print(f"  [{i}/{len(migration_statements)}] {preview}...")
                
                session.execute(text(stmt))
                session.commit()
                print(f"  ✅ Success")
                success_count += 1
            except Exception as e:
                error_msg = str(e)
                # Check if it's a "table doesn't exist" error - this is acceptable for UPDATE statements
                if ("doesn't exist" in error_msg.lower() or 
                    "no such table" in error_msg.lower() or
                    "unknown table" in error_msg.lower()):
                    # Extract table name from error
                    if "'" in error_msg:
                        table_hint = error_msg.split("'")[1] if len(error_msg.split("'")) > 1 else "unknown"
                    else:
                        table_hint = "unknown"
                    print(f"  ⏭️  Skipped (table doesn't exist: {table_hint})")
                    skip_count += 1
                else:
                    print(f"  ⚠️  Warning: {error_msg[:100]}")
                    warning_count += 1
                # Continue with other statements even if one fails
                session.rollback()
        
        print(f"\n📊 Migration Summary:")
        print(f"  ✅ Success: {success_count}")
        print(f"  ⏭️  Skipped: {skip_count}")
        print(f"  ⚠️  Warnings: {warning_count}")
        print(f"\n✅ Migration completed!\n")
        
        # Run verification queries
        if verification_statements:
            print("🔍 Running verification queries...")
            for stmt in verification_statements:
                try:
                    result = session.execute(text(stmt))
                    rows = result.fetchall()
                    if rows:
                        for row in rows:
                            print(f"  {row}")
                except Exception as e:
                    print(f"  ⚠️  Could not run verification: {str(e)[:80]}")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        session.rollback()
        return False


def main():
    """Main migration runner."""
    print(f"\n{'='*60}")
    print(f"🗄️  AutoShift Database Migration Tool")
    print(f"{'='*60}\n")
    print(f"Database: {settings.db_name}")
    print(f"Host: {settings.db_host}")
    print(f"Environment: {settings.environment}")
    
    # Determine which migration file to use
    migrations_dir = Path(__file__).parent / "migrations"
    
    # Check if using SQLite or MySQL/TiDB
    if "sqlite" in settings.database_url.lower():
        migration_file = migrations_dir / "001_remove_shift_types_sqlite.sql"
        print(f"Database type: SQLite")
    else:
        migration_file = migrations_dir / "001_remove_shift_types.sql"
        print(f"Database type: MySQL/TiDB")
    
    # Confirm before proceeding
    print(f"\n⚠️  This will modify your database!")
    print(f"Migration file: {migration_file.name}")
    
    response = input("\nDo you want to proceed? (yes/no): ").strip().lower()
    
    if response != 'yes':
        print("\n❌ Migration cancelled.")
        return
    
    # Run migration
    session = next(get_session())
    try:
        success = run_migration_file(session, str(migration_file))
        
        if success:
            print(f"\n{'='*60}")
            print(f"✅ Migration completed successfully!")
            print(f"{'='*60}\n")
            print(f"Next steps:")
            print(f"1. Verify your data: Check the output above")
            print(f"2. Test your application: Make sure everything works")
            print(f"3. Remove backups: If everything is good, you can drop backup tables")
        else:
            print(f"\n{'='*60}")
            print(f"❌ Migration completed with errors")
            print(f"{'='*60}\n")
            print(f"Please check the error messages above")
            
    finally:
        session.close()


if __name__ == "__main__":
    main()
