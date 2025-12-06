#!/usr/bin/env python3
"""
Quick script to check which tables exist in your database
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from app.database import engine
from sqlalchemy import inspect, text

print("\n🔍 Checking database tables...")
print("="*60)

# Get table names
inspector = inspect(engine)
tables = inspector.get_table_names()

print(f"\n📋 Found {len(tables)} tables:\n")
for table in sorted(tables):
    print(f"  ✓ {table}")

# Find weekly pattern table
print("\n🔎 Looking for weekly pattern table...")
pattern_tables = [t for t in tables if 'pattern' in t.lower() or 'weekly' in t.lower()]
if pattern_tables:
    print(f"  ✓ Found: {', '.join(pattern_tables)}")
else:
    print("  ❌ No weekly pattern table found")

# Check roster tables
roster_tables = [t for t in tables if 'roster' in t.lower()]
if roster_tables:
    print(f"\n📅 Roster tables: {', '.join(roster_tables)}")

print("\n" + "="*60 + "\n")

