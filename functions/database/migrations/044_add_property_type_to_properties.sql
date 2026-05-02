-- Migration: Add property_type column to properties table
-- Date: 2026-05-03
-- Description: Move property_type from landlord_profiles to properties table
--              Each property should have its own type, not shared across all landlord properties

-- Step 1: Add property_type column to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS property_type VARCHAR(50) NULL 
COMMENT 'Type of property: boarding-house, dormitory, apartment, studio, condominium, bedspace, others'
AFTER title;

-- Step 2: Migrate existing property_type data from landlord_profiles to properties
-- This copies the landlord's property type to all their properties
UPDATE properties p
INNER JOIN landlord_profiles lp ON p.landlord_id = lp.user_id
SET p.property_type = CASE
    WHEN lp.property_type = 'Boarding House' THEN 'boarding-house'
    WHEN lp.property_type = 'Dormitory' THEN 'dormitory'
    WHEN lp.property_type = 'Apartment' THEN 'apartment'
    WHEN lp.property_type = 'Studio Unit' THEN 'studio'
    WHEN lp.property_type = 'Condominium' THEN 'condominium'
    WHEN lp.property_type = 'Bed Space' THEN 'bedspace'
    WHEN lp.property_type = 'Others' THEN 'others'
    WHEN lp.property_type = 'Single unit' THEN 'boarding-house'
    ELSE 'boarding-house'
END
WHERE p.property_type IS NULL;

-- Step 3: Set default value for any remaining NULL property_type
UPDATE properties 
SET property_type = 'boarding-house' 
WHERE property_type IS NULL;

-- Step 4: Make property_type NOT NULL now that all records have values
ALTER TABLE properties 
MODIFY COLUMN property_type VARCHAR(50) NOT NULL;

-- Step 5: Add index for property_type for better query performance
CREATE INDEX IF NOT EXISTS idx_property_type ON properties(property_type);
