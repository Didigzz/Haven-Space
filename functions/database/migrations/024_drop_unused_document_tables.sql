-- Migration: Drop unused document_types and documents tables
-- Created: 2026-04-30
-- Description: Removes redundant document_types and documents tables that are not being used.
--              The actual verification system uses string-based document types stored directly
--              in verification records, not these normalized tables.

-- Drop documents table first (has foreign key to document_types)
DROP TABLE IF EXISTS documents;

-- Drop document_types table
DROP TABLE IF EXISTS document_types;
