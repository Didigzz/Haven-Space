-- Migration: Drop Onboarding Document System
-- Date: 2026-04-30
-- Reason: Entire onboarding document system was never implemented or used
--         - boarder_document_acknowledgments: 0 records
--         - landlord_documents: 0 records
--         - welcome_message_logs: 0 records
--         - Missing dependencies: auto_send_documents, welcome_message_templates tables don't exist
--         - Feature was designed but never completed or launched

-- Drop boarder_document_acknowledgments table
DROP TABLE IF EXISTS boarder_document_acknowledgments;

-- Drop welcome_message_logs table
DROP TABLE IF EXISTS welcome_message_logs;

-- Drop landlord_documents table
DROP TABLE IF EXISTS landlord_documents;
