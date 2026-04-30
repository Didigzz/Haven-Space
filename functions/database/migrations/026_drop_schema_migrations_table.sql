-- Migration: Drop schema_migrations table
-- Date: 2026-04-30
-- Description: Remove schema_migrations tracking table as it's no longer needed

DROP TABLE IF EXISTS schema_migrations;
