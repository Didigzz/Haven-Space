-- Migration: Add onboarding checklist tracking to boarder_profiles
-- Purpose: Track boarder onboarding completion after application acceptance

ALTER TABLE boarder_profiles
ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE AFTER profile_completed,
ADD COLUMN onboarding_payment_method_added BOOLEAN NOT NULL DEFAULT FALSE AFTER onboarding_completed,
ADD COLUMN onboarding_profile_completed BOOLEAN NOT NULL DEFAULT FALSE AFTER onboarding_payment_method_added,
ADD COLUMN onboarding_house_rules_read BOOLEAN NOT NULL DEFAULT FALSE AFTER onboarding_profile_completed,
ADD COLUMN onboarding_dismissed_at TIMESTAMP NULL AFTER onboarding_house_rules_read;

-- Add index for faster onboarding status queries
CREATE INDEX idx_onboarding_completed ON boarder_profiles(onboarding_completed);
