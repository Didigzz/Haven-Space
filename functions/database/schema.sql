-- Haven Space Database Schema - Normalized Version

-- ============================================================================
-- LOOKUP/REFERENCE TABLES (3NF Normalization)
-- ============================================================================

-- User roles lookup table
CREATE TABLE IF NOT EXISTS user_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO user_roles (role_name, description) VALUES
('boarder', 'Tenant looking for accommodation'),
('landlord', 'Property owner/manager'),
('admin', 'Platform administrator');

-- Account status lookup table
CREATE TABLE IF NOT EXISTS account_statuses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    status_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT IGNORE INTO account_statuses (status_name, description, is_active) VALUES
('active', 'Account is active and functional', TRUE),
('suspended', 'Account temporarily suspended', FALSE),
('banned', 'Account permanently banned', FALSE),
('pending_verification', 'Account awaiting verification', FALSE);



-- Verification system removed (2026-05-01)
-- Now using simple users.is_verified boolean flag instead of complex verification_records system

-- Property types are now stored as VARCHAR directly in landlord_profiles
-- Common values: 'Single unit', 'Multi-unit', 'Apartment', 'Dormitory'

-- Payment method types are now stored as VARCHAR directly in payment_methods
-- Common values: 'GCash', 'PayMaya', 'Bank Transfer', 'PayPal', 'GrabPay', 'Other'

-- ============================================================================
-- CORE ENTITY TABLES
-- ============================================================================

-- Addresses table (normalized address information)
CREATE TABLE IF NOT EXISTS addresses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255) NOT NULL DEFAULT '',
    city VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL DEFAULT '',
    country VARCHAR(100) NOT NULL DEFAULT 'Philippines',
    latitude DECIMAL(10, 8) NOT NULL DEFAULT 0.0,
    longitude DECIMAL(11, 8) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_location (latitude, longitude),
    INDEX idx_city_province (city, province),
    INDEX idx_country (country)
);

-- Files table (normalized file information) - created without FK constraint initially
CREATE TABLE IF NOT EXISTS files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash VARCHAR(64) NOT NULL DEFAULT '' COMMENT 'For duplicate detection',
    uploaded_by INT NULL COMMENT 'Will be set to NOT NULL after admin user is created',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_hash (file_hash)
);



-- Users Table (normalized)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL DEFAULT '',
    google_id VARCHAR(255) NULL UNIQUE,
    google_token TEXT NOT NULL,
    google_refresh_token TEXT NOT NULL,
    avatar_file_id INT NULL,
    password_hash VARCHAR(255) NOT NULL DEFAULT '',
    role_id INT NOT NULL,
    account_status_id INT NOT NULL DEFAULT 1,
    is_verified BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255) NOT NULL DEFAULT '',
    email_verification_expires DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (role_id) REFERENCES user_roles(id),
    FOREIGN KEY (account_status_id) REFERENCES account_statuses(id),
    INDEX idx_email (email),
    INDEX idx_role (role_id),
    INDEX idx_status (account_status_id)
);

-- Add FK from files to users (deferred to avoid circular dependency)
-- This will be handled after all tables are created and populated







-- Properties Table (normalized)
CREATE TABLE IF NOT EXISTS properties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    landlord_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    address_id INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    deposit VARCHAR(100) NOT NULL DEFAULT '0',
    min_stay VARCHAR(100) NOT NULL DEFAULT '1 month',
    house_rules JSON NOT NULL,
    electricity_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    water_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    internet_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    status ENUM('available', 'occupied', 'hidden') DEFAULT 'available',
    listing_moderation_status ENUM('pending_review', 'published', 'rejected') NOT NULL DEFAULT 'published',
    moderation_status ENUM('pending_review', 'published', 'rejected', 'flagged') NOT NULL DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (address_id) REFERENCES addresses(id),
    INDEX idx_landlord (landlord_id),
    INDEX idx_status (status),
    INDEX idx_price (price),
    INDEX idx_deposit (deposit),
    INDEX idx_min_stay (min_stay),
    INDEX idx_utility_costs (electricity_cost, water_cost, internet_cost)
);

-- Login Attempts Table (unchanged - already normalized)
CREATE TABLE IF NOT EXISTS login_attempts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    attempts INT DEFAULT 1,
    last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (ip_address)
);

-- Landlord Profiles Table (normalized)
CREATE TABLE IF NOT EXISTS landlord_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    boarding_house_name VARCHAR(255) NOT NULL,
    boarding_house_description TEXT NOT NULL,
    property_type VARCHAR(100) NOT NULL,
    total_rooms INT NOT NULL DEFAULT 1,
    available_rooms INT NOT NULL DEFAULT 1,
    welcome_message TEXT NOT NULL,
    house_rules_file_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (house_rules_file_id) REFERENCES files(id) ON DELETE SET NULL,
    UNIQUE KEY unique_user_landlord (user_id)
);

-- Payment Methods Table (normalized)
CREATE TABLE IF NOT EXISTS payment_methods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    landlord_id INT NOT NULL,
    method_type VARCHAR(100) NOT NULL,
    account_number VARCHAR(255) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(100) NOT NULL DEFAULT '',
    is_primary BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (landlord_id) REFERENCES landlord_profiles(id) ON DELETE CASCADE,
    INDEX idx_method_type (method_type)
);

-- Flat amenities table (property_id + amenity_name, no lookup/junction)
CREATE TABLE IF NOT EXISTS amenities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    amenity_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_property_amenity_name (property_id, amenity_name),
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Rooms Table (normalized)
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(50) DEFAULT NULL,
    room_type VARCHAR(100) DEFAULT NULL,
    property_id INT NOT NULL,
    landlord_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    deposit DECIMAL(10, 2) NOT NULL DEFAULT 0.00 COMMENT 'Security deposit amount in PHP',
    size DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT 'Room size in square meters',
    description TEXT NOT NULL,
    status VARCHAR(32) DEFAULT 'available',
    capacity INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_property (property_id),
    INDEX idx_status (status),
    INDEX idx_price (price),
    INDEX idx_room_type (room_type),
    INDEX idx_capacity (capacity)
);

-- Applications Table (normalized)
-- Note: property_id removed as it can be derived from room_id -> rooms.property_id (see migration 021)
CREATE TABLE IF NOT EXISTS applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    boarder_id INT NOT NULL,
    landlord_id INT NOT NULL,
    room_id INT NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (boarder_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    INDEX idx_boarder (boarder_id),
    INDEX idx_landlord (landlord_id),
    INDEX idx_status (status),
    UNIQUE KEY unique_boarder_room_application (boarder_id, room_id)
);



-- Boarder Profiles Table (normalized)
CREATE TABLE IF NOT EXISTS boarder_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    budget_min DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    budget_max DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    preferred_location VARCHAR(255) NOT NULL DEFAULT '',
    move_in_date DATE NOT NULL DEFAULT '1970-01-01',
    occupation VARCHAR(255) NOT NULL DEFAULT '',
    bio TEXT NOT NULL,
    profile_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_boarder (user_id)
);

-- Disputes table (normalized)
CREATE TABLE IF NOT EXISTS disputes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('payment', 'tenancy', 'property', 'other') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    opened_by INT NOT NULL,
    related_user_id INT NULL,
    related_property_id INT NULL,
    status ENUM('open', 'in_review', 'resolved', 'escalated') NOT NULL DEFAULT 'open',
    resolution_notes TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (opened_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (related_property_id) REFERENCES properties(id) ON DELETE SET NULL,
    INDEX idx_type (type),
    INDEX idx_opened_by (opened_by),
    INDEX idx_status (status)
);

-- Platform settings (unchanged - already normalized)
CREATE TABLE IF NOT EXISTS platform_settings (
    setting_key VARCHAR(64) PRIMARY KEY,
    setting_value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO platform_settings (setting_key, setting_value) VALUES
    ('maintenance_message', ''),
    ('terms_version', '1.0'),
    ('privacy_version', '1.0'),
    ('notify_admin_new_landlord', '1'),
    ('platform_fee_percent', '0');

-- Conversations table (normalized)
CREATE TABLE IF NOT EXISTS conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type ENUM('direct', 'group', 'welcome') DEFAULT 'direct',
    property_id INT NULL,
    created_by INT NOT NULL,
    is_system_thread BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_property (property_id),
    INDEX idx_created_by (created_by),
    INDEX idx_type (type)
);

-- Conversation participants table (normalized)
CREATE TABLE IF NOT EXISTS conversation_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    is_active BOOLEAN DEFAULT TRUE,
    last_read_at DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_conv_user (conversation_id, user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_conversation (conversation_id),
    INDEX idx_user (user_id),
    INDEX idx_active (is_active)
);

-- Messages table (normalized)
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    sender_id INT NOT NULL,
    message_text TEXT NOT NULL,
    has_attachment BOOLEAN DEFAULT FALSE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_conversation (conversation_id),
    INDEX idx_sender (sender_id),
    INDEX idx_created_at (created_at)
);



-- Notifications Table (normalized)
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(64) NOT NULL COMMENT 'application_accepted, application_rejected, maintenance_update, message, system, etc.',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSON NOT NULL COMMENT 'Additional context like application_id, property_id, room_id, etc.',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_unread (user_id, is_read),
    INDEX idx_created_at (created_at),
    INDEX idx_type (type)
);

-- Saved Listings Table (normalized)
CREATE TABLE IF NOT EXISTS saved_listings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    boarder_id INT NOT NULL,
    property_id INT NOT NULL,
    room_id INT NULL,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    UNIQUE KEY unique_boarder_property (boarder_id, property_id),
    FOREIGN KEY (boarder_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
    INDEX idx_boarder_saved (boarder_id, saved_at),
    INDEX idx_property_saved (property_id)
);

-- Property Photos Table (normalized)
CREATE TABLE IF NOT EXISTS property_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    photo_url VARCHAR(500) NOT NULL,
    is_cover BOOLEAN DEFAULT FALSE COMMENT 'Is this the cover/main photo?',
    display_order INT DEFAULT 0 COMMENT 'Order in which photos should be displayed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_property_id (property_id),
    INDEX idx_is_cover (property_id, is_cover),
    INDEX idx_display_order (property_id, display_order),
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Room Photos Table (normalized)
CREATE TABLE IF NOT EXISTS room_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    photo_url VARCHAR(500) NOT NULL,
    is_cover TINYINT(1) DEFAULT 0 COMMENT 'Is this the cover/main photo?',
    display_order INT DEFAULT 0 COMMENT 'Order in which photos should be displayed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    INDEX idx_room_id (room_id),
    INDEX idx_is_cover (room_id, is_cover),
    INDEX idx_display_order (room_id, display_order)
);

-- Property Reports Table (normalized)
CREATE TABLE IF NOT EXISTS property_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    reporter_id INT NOT NULL,
    reason VARCHAR(64) NOT NULL,
    details TEXT NOT NULL,
    status ENUM('open', 'reviewing', 'resolved', 'dismissed') NOT NULL DEFAULT 'open',
    resolution_notes TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_deleted_at (deleted_at)
);

-- Announcements Table (normalized)
CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    landlord_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('general', 'maintenance', 'urgent', 'reminder', 'event') NOT NULL DEFAULT 'general',
    priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    publish_date DATE NOT NULL,
    view_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_landlord_id (landlord_id),
    INDEX idx_publish_date (publish_date)
);

-- Announcement Properties Junction Table (normalized)
CREATE TABLE IF NOT EXISTS announcement_properties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    announcement_id INT NOT NULL,
    property_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    UNIQUE KEY unique_announcement_property (announcement_id, property_id)
);

-- Announcement Views Table (normalized)
CREATE TABLE IF NOT EXISTS announcement_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    announcement_id INT NOT NULL,
    user_id INT NOT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_announcement_view (announcement_id, user_id)
);

-- Payments Table (normalized)
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    boarder_id INT NOT NULL,
    landlord_id INT NOT NULL,
    room_id INT NOT NULL,
    property_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    late_fee DECIMAL(10, 2) DEFAULT 0,
    due_date DATE NOT NULL,
    paid_date DATE NULL,
    status ENUM('pending', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'pending',
    payment_method VARCHAR(50) NOT NULL DEFAULT '',
    reference_number VARCHAR(100) NOT NULL DEFAULT '',
    notes TEXT NOT NULL,
    reminder_sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (boarder_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    INDEX idx_landlord_status (landlord_id, status),
    INDEX idx_due_date (due_date),
    INDEX idx_boarder_status (boarder_id, status)
);

-- Password Reset Requests Table (normalized)
CREATE TABLE IF NOT EXISTS password_reset_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    reset_code VARCHAR(6) NOT NULL,
    expires_at INT NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at INT NOT NULL DEFAULT 0,
    created_at INT NOT NULL,
    INDEX idx_email (email),
    INDEX idx_user_id (user_id),
    INDEX idx_reset_code (reset_code),
    INDEX idx_is_used (is_used)
);

-- OAuth Pending Registrations Table (normalized)
CREATE TABLE IF NOT EXISTS oauth_pending_registrations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(64) NOT NULL UNIQUE,
    google_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL DEFAULT '',
    last_name VARCHAR(100) NOT NULL DEFAULT '',
    avatar_url VARCHAR(500) NOT NULL DEFAULT '',
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    email_verified TINYINT(1) DEFAULT 0,
    came_from_login TINYINT(1) DEFAULT 0,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default Super Admin User
-- Email: admin@mail.com
-- Password: Superadmin123
INSERT IGNORE INTO users (first_name, last_name, email, password_hash, role_id, is_verified, account_status_id) VALUES
    ('Super', 'Admin', 'admin@mail.com', '$2y$12$T7quqln.QaMfVHroclj7B.QBk.lNVWIuY65qB5KerTPJG65piAGFy', 3, TRUE, 1);

-- ============================================================================
-- FOREIGN KEY CONSTRAINTS (Added after data insertion)
-- ============================================================================

-- Now that both users and files tables exist, we can safely add the foreign key constraints

-- Handle any existing orphaned data in files table and set default
UPDATE files SET uploaded_by = 1 WHERE uploaded_by IS NULL;
DELETE FROM files WHERE uploaded_by IS NOT NULL AND uploaded_by NOT IN (SELECT id FROM users);

-- Make uploaded_by NOT NULL now that we have default values
ALTER TABLE files MODIFY COLUMN uploaded_by INT NOT NULL DEFAULT 1;

-- Note: We don't add a FK constraint for uploaded_by because it's NOT NULL
-- and ON DELETE SET NULL would conflict with that. The application layer
-- will ensure referential integrity.

-- Handle any existing orphaned data in users table
DELETE FROM users WHERE avatar_file_id IS NOT NULL AND avatar_file_id NOT IN (SELECT id FROM files);

-- Add foreign key constraint to users table
-- Note: This will fail silently if constraint already exists, which is fine
ALTER TABLE users ADD CONSTRAINT fk_users_avatar_file_id FOREIGN KEY (avatar_file_id) REFERENCES files(id) ON DELETE SET NULL;
