-- Migration: Convert payment_method_type_id FK to method_type VARCHAR
-- Date: 2026-05-01
-- Reason: Code uses VARCHAR strings directly, not FK to lookup table. Over-normalization for stable value set.

-- Check if payment_method_type_id column exists before attempting changes
SET @dbname = DATABASE();
SET @tablename = 'payment_methods';
SET @columnname = 'payment_method_type_id';
SET @columnexists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE table_schema = @dbname 
    AND table_name = @tablename 
    AND column_name = @columnname);

-- Only proceed if the old column exists (meaning this is an upgrade from old schema)
SET @sql = IF(@columnexists > 0,
    'ALTER TABLE payment_methods DROP FOREIGN KEY payment_methods_ibfk_2',
    'SELECT "Foreign key already removed or never existed" AS status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop the payment_method_type_id column if it exists
SET @sql = IF(@columnexists > 0,
    'ALTER TABLE payment_methods DROP COLUMN payment_method_type_id',
    'SELECT "Column already removed" AS status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add method_type VARCHAR column if it doesn't exist (matching what the code actually uses)
SET @methodtypeexists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE table_schema = @dbname 
    AND table_name = @tablename 
    AND column_name = 'method_type');

SET @sql = IF(@methodtypeexists = 0,
    'ALTER TABLE payment_methods ADD COLUMN method_type VARCHAR(100) NOT NULL AFTER landlord_id',
    'SELECT "method_type column already exists" AS status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for method_type if it doesn't exist
SET @indexexists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE table_schema = @dbname 
    AND table_name = @tablename 
    AND index_name = 'idx_method_type');

SET @sql = IF(@indexexists = 0,
    'ALTER TABLE payment_methods ADD INDEX idx_method_type (method_type)',
    'SELECT "Index already exists" AS status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop the now-unused payment_method_types lookup table
DROP TABLE IF EXISTS payment_method_types;
