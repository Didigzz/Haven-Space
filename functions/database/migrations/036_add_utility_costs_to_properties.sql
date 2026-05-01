-- Migration: Add utility cost columns to properties table
-- Date: 2026-05-01
-- Description: Add electricity_cost, water_cost, and internet_cost columns to properties table
--              to support displaying utility costs in boarder dashboard

-- Add columns only if they don't exist
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS electricity_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER house_rules,
ADD COLUMN IF NOT EXISTS water_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER electricity_cost,
ADD COLUMN IF NOT EXISTS internet_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER water_cost;

-- Add index for utility cost queries (only if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_utility_costs ON properties(electricity_cost, water_cost, internet_cost);
