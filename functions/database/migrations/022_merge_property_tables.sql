-- Migration: Merge property_details into properties and eliminate property_locations
-- Created: 2026-04-30
-- Description: Consolidate property-related tables to simplify schema

-- ============================================
-- Step 1: Add new columns to properties table
-- ============================================

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS deposit VARCHAR(100) NULL COMMENT 'e.g., "2 months", "₱10,000"' AFTER price,
ADD COLUMN IF NOT EXISTS min_stay VARCHAR(100) NULL COMMENT 'e.g., "6 months", "1 year"' AFTER deposit,
ADD COLUMN IF NOT EXISTS house_rules JSON NULL COMMENT 'Array of house rules with icon, title, and description' AFTER min_stay;

-- ============================================
-- Step 2: Migrate data from property_details (if exists)
-- ============================================

-- Check if property_details table exists and migrate data
SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'property_details');

SET @sql = IF(@table_exists > 0,
    'UPDATE properties p INNER JOIN property_details pd ON p.id = pd.property_id SET p.deposit = pd.deposit, p.min_stay = pd.min_stay, p.house_rules = pd.house_rules WHERE pd.property_id IS NOT NULL',
    'SELECT "property_details table does not exist, skipping data migration" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- Step 3: Migrate property_locations to addresses (if exists)
-- ============================================

SET @table_exists = (SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'property_locations');

-- Only run if property_locations exists
SET @sql = IF(@table_exists > 0,
    'INSERT IGNORE INTO addresses (address_line_1, address_line_2, city, province, latitude, longitude, created_at) SELECT pl.address_line_1, pl.address_line_2, pl.city, pl.province, pl.latitude, pl.longitude, pl.created_at FROM property_locations pl INNER JOIN landlord_profiles lp ON pl.landlord_id = lp.id INNER JOIN properties p ON p.landlord_id = lp.user_id WHERE p.address_id IS NULL OR p.address_id NOT IN (SELECT id FROM addresses) GROUP BY pl.landlord_id',
    'SELECT "property_locations table does not exist, skipping" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- Step 4: Drop redundant tables
-- ============================================

DROP TABLE IF EXISTS property_details;
DROP TABLE IF EXISTS property_locations;

-- ============================================
-- Step 5: Add indexes for new columns
-- ============================================

CREATE INDEX IF NOT EXISTS idx_deposit ON properties(deposit);
CREATE INDEX IF NOT EXISTS idx_min_stay ON properties(min_stay);
