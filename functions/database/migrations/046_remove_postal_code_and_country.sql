-- Migration: Remove postal_code and country columns from addresses table
-- Description: Removes postal_code and country columns from addresses table as they are not needed
-- Date: 2026-05-03

SET @sql = (
    SELECT CONCAT(
        'ALTER TABLE addresses '
        , IF(
            (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'addresses' AND column_name = 'postal_code') > 0,
            'DROP COLUMN postal_code,',
            ''
        )
        , IF(
            (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE() AND table_name = 'addresses' AND column_name = 'country') > 0,
            ' DROP COLUMN country',
            ''
        )
        , ';'
    ) AS statement
);

PREPARE alter_stmt FROM @sql;
EXECUTE alter_stmt;
DEALLOCATE PREPARE alter_stmt;
