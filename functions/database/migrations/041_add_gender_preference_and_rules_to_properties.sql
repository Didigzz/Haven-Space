-- Migration: Add gender_preference and property_rules to properties table
-- Date: 2026-05-02
-- Description: Adds gender preference field and property rules field to properties table

-- Add gender_preference column (male, female, any)
ALTER TABLE properties 
ADD COLUMN gender_preference ENUM('male', 'female', 'any') NOT NULL DEFAULT 'any' 
AFTER house_rules;

-- Add property_rules column (stores rules as TEXT)
ALTER TABLE properties 
ADD COLUMN property_rules TEXT NULL 
AFTER gender_preference;

-- Add index for gender_preference for filtering
ALTER TABLE properties 
ADD INDEX idx_gender_preference (gender_preference);
