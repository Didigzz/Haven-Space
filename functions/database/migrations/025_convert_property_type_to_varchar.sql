-- Migration: Convert property_type from FK to VARCHAR and drop property_types table
-- Date: 2026-04-30
-- Description: Simplifies property type management by using VARCHAR instead of lookup table

-- Check if property_type column already exists
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'landlord_profiles' 
    AND COLUMN_NAME = 'property_type'
);

-- Step 1: Add new property_type VARCHAR column to landlord_profiles (only if it doesn't exist)
SET @sql = IF(@column_exists = 0,
    'ALTER TABLE landlord_profiles ADD COLUMN property_type VARCHAR(100) NULL AFTER boarding_house_description',
    'SELECT "Column property_type already exists, skipping..." AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: Migrate existing data (if any) from property_type_id to property_type
SET @property_type_id_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'landlord_profiles' 
    AND COLUMN_NAME = 'property_type_id'
);

SET @sql = IF(@property_type_id_exists > 0,
    'UPDATE landlord_profiles lp LEFT JOIN property_types pt ON lp.property_type_id = pt.id SET lp.property_type = pt.type_name WHERE lp.property_type_id IS NOT NULL',
    'SELECT "Column property_type_id does not exist, skipping data migration..." AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Set default value for any NULL property_type
UPDATE landlord_profiles 
SET property_type = 'Single unit' 
WHERE property_type IS NULL;

-- Step 4: Make property_type NOT NULL now that all records have values (only if it's currently NULL)
SET @is_nullable = (
    SELECT IS_NULLABLE 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'landlord_profiles' 
    AND COLUMN_NAME = 'property_type'
);

SET @sql = IF(@is_nullable = 'YES',
    'ALTER TABLE landlord_profiles MODIFY COLUMN property_type VARCHAR(100) NOT NULL',
    'SELECT "Column property_type already NOT NULL, skipping..." AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 5: Drop the foreign key constraint (only if it exists)
SET @fk_exists = (
    SELECT COUNT(*) 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'landlord_profiles' 
    AND CONSTRAINT_NAME = 'landlord_profiles_ibfk_2'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);

SET @sql = IF(@fk_exists > 0,
    'ALTER TABLE landlord_profiles DROP FOREIGN KEY landlord_profiles_ibfk_2',
    'SELECT "Foreign key landlord_profiles_ibfk_2 does not exist, skipping..." AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 6: Drop the property_type_id column (only if it exists)
SET @sql = IF(@property_type_id_exists > 0,
    'ALTER TABLE landlord_profiles DROP COLUMN property_type_id',
    'SELECT "Column property_type_id does not exist, skipping..." AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 7: Drop the property_types table (only if it exists)
DROP TABLE IF EXISTS property_types;

