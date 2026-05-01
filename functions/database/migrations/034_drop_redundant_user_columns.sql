-- Migration: Drop redundant columns from users table
-- Date: 2026-05-01
-- Reason: phone (use phone_number), current_address (use addresses table via properties), date_of_birth (not needed)

-- Drop phone column (redundant with phone_number)
SET @drop_phone = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'phone') > 0,
    'ALTER TABLE users DROP COLUMN phone',
    'SELECT "Column phone does not exist" as message'
));
PREPARE stmt FROM @drop_phone;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop alt_phone column (also redundant)
SET @drop_alt_phone = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'alt_phone') > 0,
    'ALTER TABLE users DROP COLUMN alt_phone',
    'SELECT "Column alt_phone does not exist" as message'
));
PREPARE stmt FROM @drop_alt_phone;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop current_address column (addresses should be in addresses table via properties)
SET @drop_current_address = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'current_address') > 0,
    'ALTER TABLE users DROP COLUMN current_address',
    'SELECT "Column current_address does not exist" as message'
));
PREPARE stmt FROM @drop_current_address;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop date_of_birth column (not needed for the application)
SET @drop_date_of_birth = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'date_of_birth') > 0,
    'ALTER TABLE users DROP COLUMN date_of_birth',
    'SELECT "Column date_of_birth does not exist" as message'
));
PREPARE stmt FROM @drop_date_of_birth;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop gender column (also not needed)
SET @drop_gender = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'gender') > 0,
    'ALTER TABLE users DROP COLUMN gender',
    'SELECT "Column gender does not exist" as message'
));
PREPARE stmt FROM @drop_gender;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop bio column (bio should be in boarder_profiles or landlord_profiles)
SET @drop_bio = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'bio') > 0,
    'ALTER TABLE users DROP COLUMN bio',
    'SELECT "Column bio does not exist" as message'
));
PREPARE stmt FROM @drop_bio;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop employment_status column (not needed)
SET @drop_employment_status = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'employment_status') > 0,
    'ALTER TABLE users DROP COLUMN employment_status',
    'SELECT "Column employment_status does not exist" as message'
));
PREPARE stmt FROM @drop_employment_status;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop avatar_url column (use avatar_file_id FK to files table instead)
SET @drop_avatar_url = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'users' 
     AND COLUMN_NAME = 'avatar_url') > 0,
    'ALTER TABLE users DROP COLUMN avatar_url',
    'SELECT "Column avatar_url does not exist" as message'
));
PREPARE stmt FROM @drop_avatar_url;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
