-- Migration: Add utility cost columns to properties table
-- Date: 2026-05-01
-- Description: Add electricity_cost, water_cost, and internet_cost columns to properties table
--              to support displaying utility costs in boarder dashboard

ALTER TABLE properties
ADD COLUMN electricity_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER house_rules,
ADD COLUMN water_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER electricity_cost,
ADD COLUMN internet_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00 AFTER water_cost;

-- Add index for utility cost queries
CREATE INDEX idx_utility_costs ON properties(electricity_cost, water_cost, internet_cost);
