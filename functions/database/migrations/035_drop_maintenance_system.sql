-- Migration: Drop Maintenance System
-- Date: 2026-05-01
-- Description: Remove maintenance_requests table and all related functionality

-- Drop the maintenance_requests table
DROP TABLE IF EXISTS maintenance_requests;
