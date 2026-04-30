-- Migration: Flatten amenities - remove lookup/junction tables
-- Safe to run on DBs already in the flat structure (no property_amenities / no lookup rows)

-- Only run the full migration if property_amenities junction table exists
SET @pa_exists = (SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'property_amenities');

-- Step 1: Add amenity_name_flat staging column (only needed when migrating from old structure)
SET @sql = IF(@pa_exists > 0,
    'ALTER TABLE amenities ADD COLUMN IF NOT EXISTS amenity_name_flat VARCHAR(100) NULL',
    'SELECT "already flat, skipping" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Step 2: Migrate data from junction table
SET @sql = IF(@pa_exists > 0,
    'INSERT IGNORE INTO amenities (property_id, amenity_name_flat, created_at) SELECT pa.property_id, a.amenity_name, pa.created_at FROM property_amenities pa JOIN amenities a ON pa.amenity_id = a.id',
    'SELECT "skipped" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Step 3: Swap column names (only if amenity_name_flat was just added)
-- Drop unique key first so rename succeeds
SET @uk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints
    WHERE table_schema = DATABASE() AND table_name = 'amenities'
    AND constraint_name = 'unique_property_amenity_name');

SET @do_rename = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'amenities' AND column_name = 'amenity_name_flat');

SET @sql = IF(@do_rename > 0 AND @uk_exists > 0,
    'ALTER TABLE amenities DROP KEY unique_property_amenity_name',
    'SELECT "skipped" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @do_rename = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'amenities' AND column_name = 'amenity_name_flat');

SET @sql = IF(@do_rename > 0,
    'ALTER TABLE amenities CHANGE amenity_name amenity_name_old VARCHAR(100) NULL',
    'SELECT "skipped" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @do_rename = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'amenities' AND column_name = 'amenity_name_flat');

SET @sql = IF(@do_rename > 0,
    'ALTER TABLE amenities CHANGE amenity_name_flat amenity_name VARCHAR(100) NULL',
    'SELECT "skipped" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Step 4: Delete old lookup rows (no property_id)
SET @nullable = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'amenities'
    AND column_name = 'property_id' AND is_nullable = 'YES');

SET @sql = IF(@nullable > 0,
    'DELETE FROM amenities WHERE property_id IS NULL',
    'SELECT "skipped" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Step 5: Drop legacy columns if present
SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'amenities' AND column_name = 'amenity_name_old') > 0,
    'ALTER TABLE amenities DROP COLUMN amenity_name_old', 'SELECT "skipped" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'amenities' AND column_name = 'category') > 0,
    'ALTER TABLE amenities DROP COLUMN category', 'SELECT "skipped" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'amenities' AND column_name = 'icon') > 0,
    'ALTER TABLE amenities DROP COLUMN icon', 'SELECT "skipped" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Step 6: Ensure NOT NULL
ALTER TABLE amenities
    MODIFY COLUMN property_id INT NOT NULL,
    MODIFY COLUMN amenity_name VARCHAR(100) NOT NULL;

-- Step 7: Add FK if missing
SET @fk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints
    WHERE table_schema = DATABASE() AND table_name = 'amenities'
    AND constraint_name = 'fk_amenities_property');

SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE amenities ADD CONSTRAINT fk_amenities_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE',
    'SELECT "FK already exists" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add unique key if missing
SET @uk_exists = (SELECT COUNT(*) FROM information_schema.table_constraints
    WHERE table_schema = DATABASE() AND table_name = 'amenities'
    AND constraint_name = 'unique_property_amenity_name');

SET @sql = IF(@uk_exists = 0,
    'ALTER TABLE amenities ADD UNIQUE KEY unique_property_amenity_name (property_id, amenity_name)',
    'SELECT "unique key already exists" AS message');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Step 8: Drop junction table
DROP TABLE IF EXISTS property_amenities;
