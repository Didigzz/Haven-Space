-- Migration: Remove redundant columns and create compatibility views
-- Date: 2026-04-29

-- Remove redundant property_id from applications table
-- (property_id can be derived from room_id -> rooms.property_id)
ALTER TABLE applications DROP FOREIGN KEY IF EXISTS applications_ibfk_4;
ALTER TABLE applications DROP COLUMN IF EXISTS property_id;

-- Create views for backward compatibility
CREATE OR REPLACE VIEW applications_with_property AS
SELECT 
    a.*,
    r.property_id
FROM applications a
JOIN rooms r ON a.room_id = r.id;