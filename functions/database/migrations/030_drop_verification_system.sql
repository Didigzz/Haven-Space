-- Migration: Drop unused verification system tables
-- Date: 2026-05-01
-- Reason: verification_records and verification_log have 0 records and are unused
-- The system will use simple users.is_verified boolean instead

-- Drop in correct order (child tables first due to foreign keys)
DROP TABLE IF EXISTS verification_log;
DROP TABLE IF EXISTS verification_records;
DROP TABLE IF EXISTS verification_statuses;
