-- Migration: Drop message_attachments table
-- Date: 2026-04-30

-- Drop the view first if it exists
DROP VIEW IF EXISTS message_attachments_with_conversation;

-- Drop the message_attachments table
DROP TABLE IF EXISTS message_attachments;
