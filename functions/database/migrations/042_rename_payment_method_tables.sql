-- Migration: Rename payment method tables for better organization
-- Date: 2024-01-01
-- Reason: Improve table naming consistency and clarity

-- Check if old payment_methods table exists and rename it
SET @old_landlord_table_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
    WHERE table_schema = DATABASE()
    AND table_name = 'payment_methods'
);

SET @target_landlord_table_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
    WHERE table_schema = DATABASE()
    AND table_name = 'payment_methods_landlord'
);

SET @sql = IF(@old_landlord_table_exists > 0 AND @target_landlord_table_exists = 0,
    'ALTER TABLE payment_methods RENAME TO payment_methods_landlord',
    IF(@target_landlord_table_exists > 0,
        'SELECT "payment_methods_landlord table already exists, skipping rename" as status',
        'SELECT "payment_methods table not found, skipping rename" as status'));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if old boarder_payment_methods table exists and rename it
SET @old_boarder_table_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
    WHERE table_schema = DATABASE()
    AND table_name = 'boarder_payment_methods'
);

SET @target_boarder_table_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
    WHERE table_schema = DATABASE()
    AND table_name = 'payment_methods_boarder'
);

SET @sql = IF(@old_boarder_table_exists > 0 AND @target_boarder_table_exists = 0,
    'ALTER TABLE boarder_payment_methods RENAME TO payment_methods_boarder',
    IF(@target_boarder_table_exists > 0,
        'SELECT "payment_methods_boarder table already exists, skipping rename" as status',
        'SELECT "boarder_payment_methods table not found, skipping rename" as status'));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ensure indexes exist on the new table names (only add if they don't exist)
SET @landlord_table_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
    WHERE table_schema = DATABASE()
    AND table_name = 'payment_methods_landlord'
);

-- Check if indexes already exist before trying to add them
SET @idx_landlord_id_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE table_schema = DATABASE()
    AND table_name = 'payment_methods_landlord'
    AND index_name = 'idx_landlord_id'
);

SET @idx_method_type_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE table_schema = DATABASE()
    AND table_name = 'payment_methods_landlord'
    AND index_name = 'idx_method_type'
);

SET @idx_is_primary_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE table_schema = DATABASE()
    AND table_name = 'payment_methods_landlord'
    AND index_name = 'idx_is_primary'
);

-- Only add indexes that don't exist
SET @sql = IF(@landlord_table_exists > 0 AND (@idx_landlord_id_exists = 0 OR @idx_method_type_exists = 0 OR @idx_is_primary_exists = 0),
    CONCAT(
        IF(@idx_landlord_id_exists = 0, 'ALTER TABLE payment_methods_landlord ADD INDEX idx_landlord_id (landlord_id);', 'SELECT 1'),
        IF(@idx_method_type_exists = 0, 'ALTER TABLE payment_methods_landlord ADD INDEX idx_method_type (method_type);', 'SELECT 1'),
        IF(@idx_is_primary_exists = 0, 'ALTER TABLE payment_methods_landlord ADD INDEX idx_is_primary (is_primary);', 'SELECT 1')
    ),
    'SELECT "All indexes already exist, skipping index creation" as status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check boarder table indexes
SET @boarder_table_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
    WHERE table_schema = DATABASE()
    AND table_name = 'payment_methods_boarder'
);

SET @idx_user_id_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE table_schema = DATABASE()
    AND table_name = 'payment_methods_boarder'
    AND index_name = 'idx_user_id'
);

SET @sql = IF(@boarder_table_exists > 0 AND @idx_user_id_exists = 0,
    'ALTER TABLE payment_methods_boarder ADD INDEX idx_user_id (user_id)',
    'SELECT "Index already exists, skipping index creation" as status');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
