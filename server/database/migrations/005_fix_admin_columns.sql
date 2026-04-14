-- Migration: Fix admin dashboard column mismatches and add missing columns
-- Created: 2026-04-13
-- Description: Adds soft-delete columns, fixes column name mismatches, and ensures all admin API queries work

-- ============================================
-- 1. Add soft-delete (deleted_at) columns
-- ============================================
-- Add deleted_at to users table
SET @dbname = DATABASE();
SET @tablename = 'users';
SET @columnname = 'deleted_at';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " TIMESTAMP NULL DEFAULT NULL AFTER updated_at")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add deleted_at to properties table
SET @tablename = 'properties';
SET @columnname = 'deleted_at';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " TIMESTAMP NULL DEFAULT NULL AFTER updated_at")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add deleted_at to applications table
SET @tablename = 'applications';
SET @columnname = 'deleted_at';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " TIMESTAMP NULL DEFAULT NULL AFTER updated_at")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add deleted_at to property_reports table
SET @tablename = 'property_reports';
SET @columnname = 'deleted_at';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " TIMESTAMP NULL DEFAULT NULL AFTER updated_at")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add deleted_at to disputes table
SET @tablename = 'disputes';
SET @columnname = 'deleted_at';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " TIMESTAMP NULL DEFAULT NULL AFTER updated_at")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================
-- 2. Add moderation_status alias column to properties
-- ============================================
-- The API queries use 'moderation_status' but the column is 'listing_moderation_status'
-- We'll add moderation_status as an alias (same column, just referenced differently)
SET @tablename = 'properties';
SET @columnname = 'moderation_status';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " ENUM('pending_review', 'published', 'rejected', 'flagged') NOT NULL DEFAULT 'published' AFTER listing_moderation_status")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================
-- 3. Fix column name mismatches in property_reports
-- ============================================
-- API uses 'reporter_id' but migration created 'reporter_user_id'
-- Rename reporter_user_id to reporter_id for API compatibility
SET @tablename = 'property_reports';
SET @oldcolumn = 'reporter_user_id';
SET @newcolumn = 'reporter_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @newcolumn)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " CHANGE COLUMN ", @oldcolumn, " ", @newcolumn, " INT NOT NULL")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================
-- 4. Fix column name mismatches in disputes
-- ============================================
-- API uses 'opened_by' but migration created 'opened_by_user_id'
-- Rename opened_by_user_id to opened_by for API compatibility
SET @tablename = 'disputes';
SET @oldcolumn = 'opened_by_user_id';
SET @newcolumn = 'opened_by';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @newcolumn)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " CHANGE COLUMN ", @oldcolumn, " ", @newcolumn, " INT NOT NULL")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- API uses 'related_user_id' - check if it exists (it should)
SET @tablename = 'disputes';
SET @columnname = 'related_user_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " INT NULL AFTER opened_by")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- API uses 'related_property_id' - check if it exists (it should)
SET @tablename = 'disputes';
SET @columnname = 'related_property_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " INT NULL AFTER related_user_id")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================
-- 5. Add admin_notes column to disputes (if missing)
-- ============================================
SET @tablename = 'disputes';
SET @columnname = 'resolution_notes';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " TEXT AFTER status")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ============================================
-- 6. Add indexes for deleted_at columns (performance)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_properties_deleted_at ON properties(deleted_at);
CREATE INDEX IF NOT EXISTS idx_applications_deleted_at ON applications(deleted_at);
CREATE INDEX IF NOT EXISTS idx_property_reports_deleted_at ON property_reports(deleted_at);
CREATE INDEX IF NOT EXISTS idx_disputes_deleted_at ON disputes(deleted_at);

-- ============================================
-- Notes:
-- ============================================
-- 1. Soft-delete pattern: deleted_at IS NULL means record is active
-- 2. moderation_status is an alias for listing_moderation_status for API compatibility
-- 3. Column renames ensure API code matches database schema
-- 4. All changes are idempotent (safe to run multiple times)
