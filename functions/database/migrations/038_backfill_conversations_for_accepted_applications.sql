-- Backfill conversations for existing accepted applications
-- This migration creates direct conversations between landlords and boarders
-- for all existing accepted/confirmed applications that don't have conversations yet.

-- Create conversations for accepted applications
INSERT INTO conversations (title, type, created_by, is_system_thread, created_at)
SELECT 
    CONCAT('Boarder - ', b.first_name, ' ', b.last_name) as title,
    'direct' as type,
    a.landlord_id as created_by,
    0 as is_system_thread,
    NOW() as created_at
FROM applications a
JOIN users l ON a.landlord_id = l.id
JOIN users b ON a.boarder_id = b.id
WHERE a.status IN ('accepted', 'confirmed')
AND a.deleted_at IS NULL
-- Only create if conversation doesn't already exist
AND NOT EXISTS (
    SELECT 1 
    FROM conversation_participants cp1
    JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    JOIN conversations c ON cp1.conversation_id = c.id
    WHERE cp1.user_id = a.landlord_id 
    AND cp2.user_id = a.boarder_id 
    AND c.type = 'direct'
)
GROUP BY a.landlord_id, a.boarder_id;

-- Add landlord participants
INSERT INTO conversation_participants (conversation_id, user_id, role, is_active, joined_at)
SELECT 
    c.id as conversation_id,
    a.landlord_id as user_id,
    'landlord' as role,
    1 as is_active,
    NOW() as joined_at
FROM conversations c
JOIN applications a ON CONCAT('Boarder - ', (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE id = a.boarder_id)) = c.title
WHERE c.type = 'direct'
AND a.status IN ('accepted', 'confirmed')
AND a.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM conversation_participants cp 
    WHERE cp.conversation_id = c.id AND cp.user_id = a.landlord_id
)
GROUP BY c.id, a.landlord_id;

-- Add boarder participants
INSERT INTO conversation_participants (conversation_id, user_id, role, is_active, joined_at)
SELECT 
    c.id as conversation_id,
    a.boarder_id as user_id,
    'boarder' as role,
    1 as is_active,
    NOW() as joined_at
FROM conversations c
JOIN applications a ON CONCAT('Boarder - ', (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE id = a.boarder_id)) = c.title
WHERE c.type = 'direct'
AND a.status IN ('accepted', 'confirmed')
AND a.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM conversation_participants cp 
    WHERE cp.conversation_id = c.id AND cp.user_id = a.boarder_id
)
GROUP BY c.id, a.boarder_id;
