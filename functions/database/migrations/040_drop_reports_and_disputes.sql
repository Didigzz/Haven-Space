-- Migration: Drop Reports and Disputes tables
-- Date: 2026-05-02
-- Description: Remove property_reports and disputes tables entirely.
--              These features have been removed from the platform.

DROP TABLE IF EXISTS property_reports;
DROP TABLE IF EXISTS disputes;
