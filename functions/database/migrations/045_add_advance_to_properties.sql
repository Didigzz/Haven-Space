-- Migration: Add advance column to properties table
-- Description: Adds advance payment field to properties (e.g., "1 month", "2 months")
-- Date: 2026-05-03

ALTER TABLE properties 
ADD COLUMN advance VARCHAR(50) DEFAULT '1 month' COMMENT 'Advance payment required (e.g., "1 month", "2 months")';
