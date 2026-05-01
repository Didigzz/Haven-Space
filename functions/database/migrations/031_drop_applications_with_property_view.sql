-- Migration: Drop unused applications_with_property view
-- Date: 2026-05-01
-- Reason: View was never used in codebase, applications table still has property_id column

DROP VIEW IF EXISTS applications_with_property;
