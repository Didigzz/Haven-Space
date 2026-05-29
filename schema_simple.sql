-- =============================================================
-- Haven Space - Simplified Schema
-- Tables: users, properties, rooms, applications, payments,
--         announcements, messages
-- =============================================================

CREATE DATABASE IF NOT EXISTS simple_havenspace
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE simple_havenspace;

-- -------------------------------------------------------------
-- USERS
-- role: 'landlord' | 'boarder' | 'admin'
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    first_name  VARCHAR(100) NOT NULL,
    last_name   VARCHAR(100) NOT NULL,
    email       VARCHAR(255) NOT NULL UNIQUE,
    phone       VARCHAR(20)  NOT NULL DEFAULT '',
    password    VARCHAR(255) NOT NULL DEFAULT '',
    role        ENUM('landlord', 'boarder', 'admin') NOT NULL DEFAULT 'boarder',
    status      ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    avatar_url  VARCHAR(500) NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- PROPERTIES
-- Owned by a landlord (users.role = 'landlord')
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS properties (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    landlord_id     INT NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    address         VARCHAR(500) NOT NULL,
    city            VARCHAR(100) NOT NULL DEFAULT '',
    status          ENUM('available', 'occupied', 'hidden') NOT NULL DEFAULT 'available',
    gender_pref     ENUM('male', 'female', 'any') NOT NULL DEFAULT 'any',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- ROOMS
-- Belongs to a property; boarders apply to a specific room
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    room_number VARCHAR(50)  NULL,
    title       VARCHAR(255) NOT NULL,
    description TEXT         NOT NULL,
    price       DECIMAL(10,2) NOT NULL,
    deposit     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    capacity    INT          NOT NULL DEFAULT 1,
    status      ENUM('available', 'occupied', 'maintenance') NOT NULL DEFAULT 'available',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- APPLICATIONS
-- A boarder applies to rent a specific room
-- status flow: pending -> accepted | rejected | cancelled
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    boarder_id  INT NOT NULL,
    landlord_id INT NOT NULL,
    room_id     INT NOT NULL,
    message     TEXT NOT NULL,
    status      ENUM('pending', 'accepted', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (boarder_id)  REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (landlord_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id)     REFERENCES rooms(id)  ON DELETE CASCADE,
    UNIQUE KEY unique_boarder_room (boarder_id, room_id)
);

-- -------------------------------------------------------------
-- PAYMENTS
-- Monthly rent payments tied to a boarder, room, and property
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    boarder_id       INT NOT NULL,
    landlord_id      INT NOT NULL,
    room_id          INT NOT NULL,
    property_id      INT NOT NULL,
    amount           DECIMAL(10,2) NOT NULL,
    due_date         DATE NOT NULL,
    paid_date        DATE NULL,
    status           ENUM('pending', 'paid', 'overdue', 'cancelled') NOT NULL DEFAULT 'pending',
    payment_method   VARCHAR(50)  NOT NULL DEFAULT '',
    reference_number VARCHAR(100) NOT NULL DEFAULT '',
    notes            TEXT         NOT NULL DEFAULT '',
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (boarder_id)  REFERENCES users(id)       ON DELETE CASCADE,
    FOREIGN KEY (landlord_id) REFERENCES users(id)       ON DELETE CASCADE,
    FOREIGN KEY (room_id)     REFERENCES rooms(id)       ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id)  ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- ANNOUNCEMENTS
-- Posted by a landlord; optionally targeted to a property
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS announcements (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    landlord_id INT NOT NULL,
    property_id INT NULL COMMENT 'NULL = broadcast to all properties',
    title       VARCHAR(255) NOT NULL,
    body        TEXT         NOT NULL,
    category    ENUM('general', 'maintenance', 'urgent', 'reminder', 'event') NOT NULL DEFAULT 'general',
    priority    ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (landlord_id) REFERENCES users(id)       ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id)  ON DELETE SET NULL
);

-- -------------------------------------------------------------
-- MESSAGES
-- Direct messages between two users (boarder <-> landlord)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    sender_id   INT NOT NULL,
    receiver_id INT NOT NULL,
    body        TEXT    NOT NULL,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id)   REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);
