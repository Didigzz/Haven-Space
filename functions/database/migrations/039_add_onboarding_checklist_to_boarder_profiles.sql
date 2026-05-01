-- Migration: Add onboarding checklist tracking to boarder_profiles
-- Purpose: Track boarder onboarding completion after application acceptance
-- Note: This migration is idempotent - it checks if columns exist before adding them

-- Check and add onboarding_completed column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'boarder_profiles' 
    AND column_name = 'onboarding_completed');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE boarder_profiles ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE AFTER profile_completed',
    'SELECT "Column onboarding_completed already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add onboarding_payment_method_added column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'boarder_profiles' 
    AND column_name = 'onboarding_payment_method_added');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE boarder_profiles ADD COLUMN onboarding_payment_method_added BOOLEAN NOT NULL DEFAULT FALSE AFTER onboarding_completed',
    'SELECT "Column onboarding_payment_method_added already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add onboarding_profile_completed column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'boarder_profiles' 
    AND column_name = 'onboarding_profile_completed');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE boarder_profiles ADD COLUMN onboarding_profile_completed BOOLEAN NOT NULL DEFAULT FALSE AFTER onboarding_payment_method_added',
    'SELECT "Column onboarding_profile_completed already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add onboarding_house_rules_read column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'boarder_profiles' 
    AND column_name = 'onboarding_house_rules_read');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE boarder_profiles ADD COLUMN onboarding_house_rules_read BOOLEAN NOT NULL DEFAULT FALSE AFTER onboarding_profile_completed',
    'SELECT "Column onboarding_house_rules_read already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add onboarding_dismissed_at column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'boarder_profiles' 
    AND column_name = 'onboarding_dismissed_at');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE boarder_profiles ADD COLUMN onboarding_dismissed_at TIMESTAMP NULL AFTER onboarding_house_rules_read',
    'SELECT "Column onboarding_dismissed_at already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add index for faster onboarding status queries
SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE table_schema = DATABASE() 
    AND table_name = 'boarder_profiles' 
    AND index_name = 'idx_onboarding_completed');

SET @sql = IF(@index_exists = 0, 
    'CREATE INDEX idx_onboarding_completed ON boarder_profiles(onboarding_completed)',
    'SELECT "Index idx_onboarding_completed already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
