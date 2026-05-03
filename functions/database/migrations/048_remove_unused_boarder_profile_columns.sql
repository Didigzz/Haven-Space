-- Migration: Remove unused columns from boarder_profiles table
-- Description: Removes columns that are no longer needed in boarder_profiles
-- Date: 2026-05-03

SET @sql = (
    SELECT CONCAT(
        'ALTER TABLE boarder_profiles '
        , IF(
            (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'boarder_profiles' AND column_name = 'budget_min') > 0,
            'DROP COLUMN budget_min,',
            ''
        )
        , IF(
            (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'boarder_profiles' AND column_name = 'budget_max') > 0,
            ' DROP COLUMN budget_max,',
            ''
        )
        , IF(
            (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'boarder_profiles' AND column_name = 'preferred_location') > 0,
            ' DROP COLUMN preferred_location,',
            ''
        )
        , IF(
            (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'boarder_profiles' AND column_name = 'occupation') > 0,
            ' DROP COLUMN occupation,',
            ''
        )
        , IF(
            (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'boarder_profiles' AND column_name = 'bio') > 0,
            ' DROP COLUMN bio,',
            ''
        )
        , IF(
            (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'boarder_profiles' AND column_name = 'profile_completed') > 0,
            ' DROP COLUMN profile_completed,',
            ''
        )
        , IF(
            (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'boarder_profiles' AND column_name = 'onboarding_completed') > 0,
            ' DROP COLUMN onboarding_completed,',
            ''
        )
        , IF(
            (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'boarder_profiles' AND column_name = 'onboarding_payment_method_added') > 0,
            ' DROP COLUMN onboarding_payment_method_added,',
            ''
        )
        , IF(
            (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'boarder_profiles' AND column_name = 'onboarding_profile_completed') > 0,
            ' DROP COLUMN onboarding_profile_completed,',
            ''
        )
        , IF(
            (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'boarder_profiles' AND column_name = 'onboarding_house_rules_read') > 0,
            ' DROP COLUMN onboarding_house_rules_read,',
            ''
        )
        , IF(
            (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'boarder_profiles' AND column_name = 'onboarding_dismissed_at') > 0,
            ' DROP COLUMN onboarding_dismissed_at',
            ''
        )
        , ';'
    ) AS statement
);

PREPARE alter_stmt FROM @sql;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;
