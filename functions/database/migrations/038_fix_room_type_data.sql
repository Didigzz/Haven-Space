-- Migration: Fix room_type data
-- Date: 2026-05-01
-- Description: Move room names from room_type to room_number and set proper room types based on capacity

-- Update rooms where room_type contains room names instead of actual types
-- Move the current room_type value to room_number if room_number is 'N/A'
UPDATE rooms
SET 
    room_number = CASE 
        WHEN room_number = 'N/A' OR room_number IS NULL THEN room_type
        ELSE room_number
    END,
    room_type = CASE
        WHEN capacity = 1 THEN 'Single'
        WHEN capacity = 2 THEN 'Shared (2 persons)'
        WHEN capacity = 3 THEN 'Shared (3 persons)'
        WHEN capacity = 4 THEN 'Shared (4 persons)'
        WHEN capacity >= 5 THEN 'Shared (5+ persons)'
        ELSE 'Single'
    END
WHERE room_type NOT IN ('Single', 'Shared', 'Private', 'Studio', 'Shared (2 persons)', 'Shared (3 persons)', 'Shared (4 persons)', 'Shared (5+ persons)')
   OR room_type LIKE 'Room %'
   OR room_type LIKE '%Room';
