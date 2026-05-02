-- Migration: Convert all NULL columns to NOT NULL with appropriate defaults
-- Created: 2026-05-01
-- Purpose: Enforce data integrity by eliminating nullable columns

-- ============================================================================
-- STEP 1: Update existing NULL values to appropriate defaults
-- ============================================================================

-- addresses table
UPDATE addresses SET address_line_2 = '' WHERE address_line_2 IS NULL;
UPDATE addresses SET postal_code = '' WHERE postal_code IS NULL;
UPDATE addresses SET latitude = 0.0 WHERE latitude IS NULL;
UPDATE addresses SET longitude = 0.0 WHERE longitude IS NULL;

-- files table
UPDATE files SET file_hash = '' WHERE file_hash IS NULL;
UPDATE files SET uploaded_by = 1 WHERE uploaded_by IS NULL; -- Default to admin user

-- users table
UPDATE users SET phone_number = '' WHERE phone_number IS NULL;
-- google_id remains nullable because it has UNIQUE constraint and empty string would cause duplicates
UPDATE users SET google_token = '' WHERE google_token IS NULL;
UPDATE users SET google_refresh_token = '' WHERE google_refresh_token IS NULL;
UPDATE users SET avatar_file_id = NULL WHERE avatar_file_id IS NOT NULL AND avatar_file_id NOT IN (SELECT id FROM files);
-- avatar_file_id will remain nullable as it's a valid optional FK
UPDATE users SET password_hash = '' WHERE password_hash IS NULL;
UPDATE users SET email_verification_token = '' WHERE email_verification_token IS NULL;
UPDATE users SET email_verification_expires = '1970-01-01 00:00:00' WHERE email_verification_expires IS NULL;

-- properties table
UPDATE properties SET description = '' WHERE description IS NULL;
UPDATE properties SET deposit = '0' WHERE deposit IS NULL;
UPDATE properties SET min_stay = '1 month' WHERE min_stay IS NULL;
UPDATE properties SET house_rules = JSON_ARRAY() WHERE house_rules IS NULL;

-- landlord_profiles table
UPDATE landlord_profiles SET boarding_house_description = '' WHERE boarding_house_description IS NULL;
UPDATE landlord_profiles SET welcome_message = '' WHERE welcome_message IS NULL;
-- house_rules_file_id will remain nullable as it's a valid optional FK

-- payment_methods_landlord table
UPDATE payment_methods_landlord SET bank_name = '' WHERE bank_name IS NULL;

-- boarder_profiles table
UPDATE boarder_profiles SET budget_min = 0.00 WHERE budget_min IS NULL;
UPDATE boarder_profiles SET budget_max = 0.00 WHERE budget_max IS NULL;
UPDATE boarder_profiles SET preferred_location = '' WHERE preferred_location IS NULL;
UPDATE boarder_profiles SET move_in_date = '1970-01-01' WHERE move_in_date IS NULL;
UPDATE boarder_profiles SET occupation = '' WHERE occupation IS NULL;
UPDATE boarder_profiles SET bio = '' WHERE bio IS NULL;

-- conversations table
-- property_id will remain nullable as it's an optional FK

-- conversation_participants table
UPDATE conversation_participants SET role = 'member' WHERE role IS NULL;
UPDATE conversation_participants SET last_read_at = '1970-01-01 00:00:00' WHERE last_read_at IS NULL;

-- messages table
UPDATE messages SET message_text = '' WHERE message_text IS NULL;

-- notifications table
UPDATE notifications SET message = '' WHERE message IS NULL;
UPDATE notifications SET metadata = JSON_OBJECT() WHERE metadata IS NULL;

-- saved_listings table
-- room_id will remain nullable as it's an optional FK

-- applications table
-- Note: property_id was removed in migration 021 (redundant with room_id -> rooms.property_id)
UPDATE applications SET message = '' WHERE message IS NULL;

-- user_roles table
UPDATE user_roles SET description = '' WHERE description IS NULL;

-- account_statuses table
UPDATE account_statuses SET description = '' WHERE description IS NULL;

-- password_reset_requests table
UPDATE password_reset_requests SET used_at = 0 WHERE used_at IS NULL;

-- oauth_pending_registrations table
UPDATE oauth_pending_registrations SET first_name = '' WHERE first_name IS NULL;
UPDATE oauth_pending_registrations SET last_name = '' WHERE last_name IS NULL;
UPDATE oauth_pending_registrations SET avatar_url = '' WHERE avatar_url IS NULL;
UPDATE oauth_pending_registrations SET access_token = '' WHERE access_token IS NULL;
UPDATE oauth_pending_registrations SET refresh_token = '' WHERE refresh_token IS NULL;

-- payments table
UPDATE payments SET payment_method = '' WHERE payment_method IS NULL;
UPDATE payments SET reference_number = '' WHERE reference_number IS NULL;
UPDATE payments SET notes = '' WHERE notes IS NULL;

-- rooms table (from migration 006)
UPDATE rooms SET size = 0.00 WHERE size IS NULL;
UPDATE rooms SET description = '' WHERE description IS NULL;

-- ============================================================================
-- STEP 2: Alter columns to NOT NULL with defaults
-- ============================================================================

-- addresses table
ALTER TABLE addresses
    MODIFY COLUMN address_line_2 VARCHAR(255) NOT NULL DEFAULT '',
    MODIFY COLUMN postal_code VARCHAR(20) NOT NULL DEFAULT '',
    MODIFY COLUMN latitude DECIMAL(10, 8) NOT NULL DEFAULT 0.0,
    MODIFY COLUMN longitude DECIMAL(11, 8) NOT NULL DEFAULT 0.0;

-- files table
ALTER TABLE files
    MODIFY COLUMN file_hash VARCHAR(64) NOT NULL DEFAULT '',
    MODIFY COLUMN uploaded_by INT NOT NULL DEFAULT 1;

-- users table
ALTER TABLE users
    MODIFY COLUMN phone_number VARCHAR(20) NOT NULL DEFAULT '',
    MODIFY COLUMN google_token TEXT NOT NULL,
    MODIFY COLUMN google_refresh_token TEXT NOT NULL,
    MODIFY COLUMN password_hash VARCHAR(255) NOT NULL DEFAULT '',
    MODIFY COLUMN email_verification_token VARCHAR(255) NOT NULL DEFAULT '',
    MODIFY COLUMN email_verification_expires DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';
-- google_id remains nullable (UNIQUE constraint + empty string = duplicate key errors)
-- avatar_file_id remains nullable (optional FK)

-- properties table
ALTER TABLE properties
    MODIFY COLUMN description TEXT NOT NULL,
    MODIFY COLUMN deposit VARCHAR(100) NOT NULL DEFAULT '0',
    MODIFY COLUMN min_stay VARCHAR(100) NOT NULL DEFAULT '1 month',
    MODIFY COLUMN house_rules JSON NOT NULL;

-- landlord_profiles table
ALTER TABLE landlord_profiles
    MODIFY COLUMN boarding_house_description TEXT NOT NULL,
    MODIFY COLUMN welcome_message TEXT NOT NULL;
-- house_rules_file_id remains nullable (optional FK)

-- payment_methods_landlord table
ALTER TABLE payment_methods_landlord
    MODIFY COLUMN bank_name VARCHAR(100) NOT NULL DEFAULT '';

-- boarder_profiles table
ALTER TABLE boarder_profiles
    MODIFY COLUMN budget_min DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    MODIFY COLUMN budget_max DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    MODIFY COLUMN preferred_location VARCHAR(255) NOT NULL DEFAULT '',
    MODIFY COLUMN move_in_date DATE NOT NULL DEFAULT '1970-01-01',
    MODIFY COLUMN occupation VARCHAR(255) NOT NULL DEFAULT '',
    MODIFY COLUMN bio TEXT NOT NULL;

-- conversation_participants table
ALTER TABLE conversation_participants
    MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'member',
    MODIFY COLUMN last_read_at DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';

-- messages table
ALTER TABLE messages
    MODIFY COLUMN message_text TEXT NOT NULL;

-- notifications table
ALTER TABLE notifications
    MODIFY COLUMN message TEXT NOT NULL,
    MODIFY COLUMN metadata JSON NOT NULL;

-- applications table
ALTER TABLE applications
    MODIFY COLUMN message TEXT NOT NULL;
-- Note: property_id was removed in migration 021

-- user_roles table
ALTER TABLE user_roles
    MODIFY COLUMN description TEXT NOT NULL;

-- account_statuses table
ALTER TABLE account_statuses
    MODIFY COLUMN description TEXT NOT NULL;

-- password_reset_requests table
ALTER TABLE password_reset_requests
    MODIFY COLUMN used_at INT NOT NULL DEFAULT 0;

-- oauth_pending_registrations table
ALTER TABLE oauth_pending_registrations
    MODIFY COLUMN first_name VARCHAR(100) NOT NULL DEFAULT '',
    MODIFY COLUMN last_name VARCHAR(100) NOT NULL DEFAULT '',
    MODIFY COLUMN avatar_url VARCHAR(500) NOT NULL DEFAULT '',
    MODIFY COLUMN access_token TEXT NOT NULL,
    MODIFY COLUMN refresh_token TEXT NOT NULL;

-- payments table
ALTER TABLE payments
    MODIFY COLUMN payment_method VARCHAR(50) NOT NULL DEFAULT '',
    MODIFY COLUMN reference_number VARCHAR(100) NOT NULL DEFAULT '',
    MODIFY COLUMN notes TEXT NOT NULL;

-- rooms table (from migration 006)
ALTER TABLE rooms
    MODIFY COLUMN size DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    MODIFY COLUMN description TEXT NOT NULL;

-- ============================================================================
-- SUMMARY OF COLUMNS THAT REMAIN NULLABLE (Valid Optional Foreign Keys)
-- ============================================================================
-- users.avatar_file_id - Optional profile picture
-- users.google_id - Optional Google OAuth ID (UNIQUE constraint requires NULL for non-Google users)
-- landlord_profiles.house_rules_file_id - Optional house rules document
-- conversations.property_id - Optional property context
-- saved_listings.room_id - Optional specific room reference
-- Note: applications.property_id was removed in migration 021 (redundant)
-- payments.paid_date - Nullable until payment is made
-- payments.reminder_sent_at - Nullable until reminder is sent
-- All deleted_at columns (soft delete pattern)
-- All read_at columns (nullable until read)
