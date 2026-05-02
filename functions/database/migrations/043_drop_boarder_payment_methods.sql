-- Migration: Drop deprecated boarder_payment_methods table
-- Date: 2024-01-01
-- Reason: Remove deprecated table that was renamed to payment_methods_boarder

-- Check if the deprecated boarder_payment_methods table exists
SET @table_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
    WHERE table_schema = DATABASE()
    AND table_name = 'boarder_payment_methods'
);

-- Drop the table if it exists
SET @sql = IF(@table_exists > 0,
    'DROP TABLE boarder_payment_methods',
    'SELECT "boarder_payment_methods table not found, skipping drop" as status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
