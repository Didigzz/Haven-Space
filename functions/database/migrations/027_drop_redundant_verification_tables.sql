-- Migration: Drop redundant landlord verification tables
-- These tables duplicate functionality already provided by the normalized
-- verification_records and verification_log tables.
--
-- landlord_verification_data: Stores registration form data that's either
--   redundant (phone already in users table) or should be in documents (ID info)
-- landlord_verification_log: Duplicates verification_log functionality
--
-- The normalized verification_records + verification_log system handles all
-- verification tracking needs and supports multiple entity types.

-- Drop landlord_verification_log (redundant with verification_log)
DROP TABLE IF EXISTS landlord_verification_log;

-- Drop landlord_verification_data (unused registration form data)
DROP TABLE IF EXISTS landlord_verification_data;
