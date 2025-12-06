# Database Migrations

This directory contains database migration scripts for AutoShift.

## Quick Start

### Option 1: Run Python Migration Script (Recommended)

```bash
cd fastapi-backend
source myvenv/bin/activate  # or activate your virtual environment
python migrate.py
```

The script will:
- Automatically detect your database type (SQLite vs MySQL/TiDB)
- Show you what will be changed
- Ask for confirmation before proceeding
- Run the migration
- Show verification results

### Option 2: Manual SQL Execution

#### For MySQL/TiDB Cloud:

```bash
# Connect to your database
mysql -h <your-host> -u <username> -p <database>

# Run the migration
source migrations/001_remove_shift_types.sql

# Or using mysql client
mysql -h <your-host> -u <username> -p <database> < migrations/001_remove_shift_types.sql
```

#### For SQLite:

```bash
# Open SQLite database
sqlite3 hospital_roster.db

# Run the migration
.read migrations/001_remove_shift_types_sqlite.sql
```

## Migration 001: Remove Shift Types

**Date:** 2025-01-06  
**Description:** Remove RESUS, EDX, AUC, OFF shift types. Keep only MORNING, AFTERNOON, EVENING, NIGHT.

### What it does:

1. **Backs up data** (creates backup tables)
2. **Migrates existing shifts:**
   - `resus` → `morning`
   - `edx` → `morning`
   - `auc` → `morning`
   - `off` → deleted (or can be mapped to notes)
3. **Updates schema** to only allow 4 shift types
4. **Updates weekly patterns** to use new shift types

### Before Running:

1. **Backup your database:**
   ```bash
   # For SQLite
   cp hospital_roster.db hospital_roster.db.backup
   
   # For MySQL/TiDB
   mysqldump -h <host> -u <user> -p <database> > backup_$(date +%Y%m%d).sql
   ```

2. **Check your environment:**
   ```bash
   # Make sure your .env file is configured
   cat .env
   ```

3. **Stop your application:**
   ```bash
   # Stop the FastAPI server before migrating
   ```

### After Running:

1. **Verify the migration:**
   ```bash
   python check_db.py
   ```

2. **Check shift types:**
   ```sql
   SELECT DISTINCT shift_type FROM monthlyroster;
   -- Should only show: morning, afternoon, evening, night
   ```

3. **Test your application:**
   ```bash
   python run.py
   ```

4. **Remove backup tables** (once you're sure everything works):
   ```sql
   DROP TABLE IF EXISTS monthlyroster_backup;
   DROP TABLE IF EXISTS shiftrequest_backup;
   ```

## Rollback

If something goes wrong, you can restore from backups:

### SQLite:
```bash
# Restore from file backup
cp hospital_roster.db.backup hospital_roster.db
```

### MySQL/TiDB:
```sql
-- Restore from backup tables
DROP TABLE monthlyroster;
CREATE TABLE monthlyroster AS SELECT * FROM monthlyroster_backup;

DROP TABLE shiftrequest;
CREATE TABLE shiftrequest AS SELECT * FROM shiftrequest_backup;
```

Or restore from SQL dump:
```bash
mysql -h <host> -u <user> -p <database> < backup_20250106.sql
```

## Future Migrations

To add a new migration:

1. Create a new SQL file: `migrations/00X_description.sql`
2. Follow the same format as existing migrations
3. Update the `migrate.py` script if needed
4. Document the migration in this README

## Setting Up Alembic (Optional)

For more advanced migration management, you can set up Alembic:

```bash
pip install alembic
alembic init alembic
```

Then configure `alembic.ini` with your database URL.

## Troubleshooting

### "Table already exists" error
- You may have already run the migration
- Check `SELECT * FROM monthlyroster_backup;`

### "Column doesn't exist" error
- Your schema might be different
- Check your current schema: `DESCRIBE monthlyroster;`

### ENUM constraint error (MySQL/TiDB)
- Make sure all data is migrated before altering the column
- Run the UPDATE statements separately first

### Permission denied
- Make sure you have write permissions on the database
- For TiDB Cloud, ensure your user has ALTER permissions

## Support

If you encounter issues:
1. Check the error message carefully
2. Verify your database connection
3. Check your `.env` configuration
4. Look at the migration SQL file to understand what it's trying to do
5. Try running statements one at a time manually

