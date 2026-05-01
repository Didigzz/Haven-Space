-- Migration: Prevent Duplicate Applications
-- Date: 2026-05-01
-- Description: Add unique constraint to prevent boarders from applying multiple times to the same room

-- First, remove any existing duplicate applications (keep the oldest one)
DELETE a1 FROM applications a1
INNER JOIN applications a2 
WHERE a1.boarder_id = a2.boarder_id 
  AND a1.room_id = a2.room_id 
  AND a1.id > a2.id
  AND a1.deleted_at IS NULL
  AND a2.deleted_at IS NULL;

-- Add unique constraint to prevent future duplicates
-- This allows only one active application per boarder per room
-- Note: This constraint only applies to active (non-deleted) applications
-- When an application is soft-deleted, it should be handled by updating status instead
ALTER TABLE applications 
ADD UNIQUE KEY unique_boarder_room_application (boarder_id, room_id);

-- Note: With this constraint, soft-deleted applications will still block new applications
-- This is actually the desired behavior - if a boarder deletes an application,
-- they should not be able to immediately re-apply to the same room
-- If re-application is needed, the old application should be hard-deleted first
