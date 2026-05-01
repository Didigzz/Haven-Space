-- Migration: Prevent Duplicate Applications
-- Date: 2026-05-01
-- Description: Add unique constraint to prevent boarders from applying multiple times to the same room

-- Check if the unique constraint already exists
SET @constraint_exists = (
    SELECT COUNT(*) 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'applications'
    AND CONSTRAINT_NAME = 'unique_boarder_room_application'
    AND CONSTRAINT_TYPE = 'UNIQUE'
);

-- Only proceed if constraint doesn't exist
SET @sql = IF(@constraint_exists = 0,
    'DELETE a1 FROM applications a1
     INNER JOIN applications a2 
     WHERE a1.boarder_id = a2.boarder_id 
       AND a1.room_id = a2.room_id 
       AND a1.id > a2.id
       AND a1.deleted_at IS NULL
       AND a2.deleted_at IS NULL;
     
     ALTER TABLE applications 
     ADD UNIQUE KEY unique_boarder_room_application (boarder_id, room_id);',
    'SELECT "Constraint already exists, skipping migration" as message;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Note: With this constraint, soft-deleted applications will still block new applications
-- This is actually the desired behavior - if a boarder deletes an application,
-- they should not be able to immediately re-apply to the same room
-- If re-application is needed, the old application should be hard-deleted first
