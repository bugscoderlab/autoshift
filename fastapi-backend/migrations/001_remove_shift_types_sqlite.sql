-- Migration for SQLite: Remove RESUS, EDX, AUC, OFF shift types
-- Date: 2025-01-06
-- Note: SQLite doesn't support ALTER COLUMN for ENUM, so we need to recreate tables

-- ============================================================================
-- STEP 1: Backup existing data
-- ============================================================================
CREATE TABLE monthlyroster_backup AS SELECT * FROM monthlyroster;
CREATE TABLE shiftrequest_backup AS SELECT * FROM shiftrequest;

-- ============================================================================
-- STEP 2: Migrate data in existing tables
-- ============================================================================

-- Map RESUS, EDX, AUC to MORNING
UPDATE monthlyroster 
SET shift_type = 'morning' 
WHERE shift_type IN ('resus', 'edx', 'auc');

UPDATE shiftrequest 
SET shift_type = 'morning' 
WHERE shift_type IN ('resus', 'edx', 'auc');

-- Remove OFF shifts
DELETE FROM monthlyroster WHERE shift_type = 'off';

-- ============================================================================
-- STEP 3: Update weekly fixed patterns
-- ============================================================================

UPDATE weekly_fixed_pattern SET day_1 = 'morning' WHERE day_1 IN ('resus', 'edx', 'auc');
UPDATE weekly_fixed_pattern SET day_2 = 'morning' WHERE day_2 IN ('resus', 'edx', 'auc');
UPDATE weekly_fixed_pattern SET day_3 = 'morning' WHERE day_3 IN ('resus', 'edx', 'auc');
UPDATE weekly_fixed_pattern SET day_4 = 'morning' WHERE day_4 IN ('resus', 'edx', 'auc');
UPDATE weekly_fixed_pattern SET day_5 = 'morning' WHERE day_5 IN ('resus', 'edx', 'auc');
UPDATE weekly_fixed_pattern SET day_6 = 'morning' WHERE day_6 IN ('resus', 'edx', 'auc');
UPDATE weekly_fixed_pattern SET day_7 = 'morning' WHERE day_7 IN ('resus', 'edx', 'auc');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check for any remaining old shift types
SELECT 'monthlyroster shift types:' as check_name;
SELECT DISTINCT shift_type FROM monthlyroster;

SELECT 'shiftrequest shift types:' as check_name;
SELECT DISTINCT shift_type FROM shiftrequest;

-- Count shifts by type
SELECT 'Shift counts:' as check_name;
SELECT shift_type, COUNT(*) as count FROM monthlyroster GROUP BY shift_type;

-- Note: SQLite uses TEXT type for shift_type, not ENUM, so no schema changes needed
-- Just make sure your application validates the values

