-- Migration: Add deposit column to rooms table
-- Date: 2026-05-01

ALTER TABLE rooms
    ADD COLUMN deposit DECIMAL(10, 2) NOT NULL DEFAULT 0.00
        COMMENT 'Security deposit amount in PHP'
        AFTER price;
