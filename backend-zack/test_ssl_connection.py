#!/usr/bin/env python3
"""Test script to verify SSL connection to TiDB Cloud."""

import sys
from app.config import settings
from app.db.session import get_ssl_config

print("=" * 60)
print("TiDB Cloud SSL Connection Test")
print("=" * 60)
print(f"DB Host: {settings.db_host}")
print(f"Is TiDB Cloud (auto-detected): {settings.is_tidb_cloud}")
print(f"Force SSL: {settings.db_force_ssl}")
print()

ssl_config = get_ssl_config()
print(f"SSL Configuration: {ssl_config}")
print(f"SSL Enabled: {bool(ssl_config.get('ssl'))}")
print()

if not ssl_config.get('ssl'):
    print("⚠️  WARNING: SSL is NOT enabled!")
    print()
    print("To fix this:")
    print("1. Add DB_FORCE_SSL=true to your .env file, OR")
    print("2. Make sure DB_HOST contains one of: tidbcloud.com, gateway01, gateway02")
    print()
    sys.exit(1)
else:
    print("✅ SSL is enabled in configuration")
    print()
    print("If you still get SSL errors, try:")
    print("- Verify your .env file has DB_FORCE_SSL=true")
    print("- Check that DB_HOST is correct")
    print("- Ensure your TiDB Cloud cluster allows connections from your IP")

