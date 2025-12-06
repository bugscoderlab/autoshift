-- Migration: Remove RESUS, EDX, AUC, OFF shift types
-- Date: 2025-01-06
-- Description: Update database to only support MORNING, AFTERNOON, EVENING, NIGHT shift types

-- ============================================================================
-- STEP 1: Backup existing data (optional but recommended)
-- ============================================================================
-- Run this first to create backups:
-- CREATE TABLE monthly_roster_backup AS SELECT * FROM monthly_roster;
-- CREATE TABLE shift_request_backup AS SELECT * FROM shift_request;

-- ============================================================================
-- STEP 2: Migrate existing data to new shift types
-- ============================================================================

-- Map RESUS, EDX, AUC to MORNING (since they all operate in similar morning/day timeframes)
UPDATE monthly_roster 
SET shift_type = 'morning' 
WHERE shift_type IN ('resus', 'edx', 'auc');

UPDATE shift_request 
SET shift_type = 'morning' 
WHERE shift_type IN ('resus', 'edx', 'auc');

-- Remove OFF shifts (or map to a specific type if needed)
-- Option 1: Delete OFF shifts
DELETE FROM monthly_roster WHERE shift_type = 'off';

-- Option 2: Or if you want to keep them, map to a day off indicator
-- UPDATE monthlyroster SET shift_type = 'morning', notes = 'Day Off' WHERE shift_type = 'off';

-- ============================================================================
-- STEP 3: Update ENUM constraints (MySQL/TiDB only)
-- ============================================================================
-- For MySQL/TiDB, we need to modify the column to use new ENUM

-- Modify monthly_roster table
ALTER TABLE monthly_roster 
MODIFY COLUMN shift_type ENUM('morning', 'afternoon', 'evening', 'night') NOT NULL;

-- Modify shift_request table
ALTER TABLE shift_request 
MODIFY COLUMN shift_type ENUM('morning', 'afternoon', 'evening', 'night') NOT NULL;

-- ============================================================================
-- STEP 4: Update weekly fixed patterns
-- ============================================================================
-- Update any patterns that use the old shift types

UPDATE weekly_fixed_pattern SET day_1 = 'morning' WHERE day_1 IN ('resus', 'edx', 'auc');
UPDATE weekly_fixed_pattern SET day_2 = 'morning' WHERE day_2 IN ('resus', 'edx', 'auc');
UPDATE weekly_fixed_pattern SET day_3 = 'morning' WHERE day_3 IN ('resus', 'edx', 'auc');
UPDATE weekly_fixed_pattern SET day_4 = 'morning' WHERE day_4 IN ('resus', 'edx', 'auc');
UPDATE weekly_fixed_pattern SET day_5 = 'morning' WHERE day_5 IN ('resus', 'edx', 'auc');
UPDATE weekly_fixed_pattern SET day_6 = 'morning' WHERE day_6 IN ('resus', 'edx', 'auc');
UPDATE weekly_fixed_pattern SET day_7 = 'morning' WHERE day_7 IN ('resus', 'edx', 'auc');

-- Note: 'off' is still valid in weekly patterns, so we keep it

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the migration was successful:

-- Check for any remaining old shift types in monthly_roster
-- SELECT DISTINCT shift_type FROM monthly_roster;

-- Check for any remaining old shift types in shift_request
-- SELECT DISTINCT shift_type FROM shift_request;

-- Check updated weekly patterns
-- SELECT * FROM weekly_fixed_pattern;

-- Count shifts by type
-- SELECT shift_type, COUNT(*) as count FROM monthly_roster GROUP BY shift_type;

