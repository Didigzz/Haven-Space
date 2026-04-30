-- Remove redundant property_id column from announcements table
-- The announcement_properties junction table handles all property targeting scenarios

-- Check if property_id column exists
SET @column_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'announcements' 
    AND COLUMN_NAME = 'property_id'
);

-- Only proceed if the column exists
SET @sql = IF(@column_exists > 0, 'SELECT "Column exists, proceeding with migration..." AS message', 'SELECT "Column property_id does not exist, migration already applied" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop the foreign key constraint (only if it exists)
SET @fk_exists = (
    SELECT COUNT(*) 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'announcements' 
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
    AND CONSTRAINT_NAME LIKE '%property_id%' OR CONSTRAINT_NAME = 'announcements_ibfk_2'
);

SET @fk_name = (
    SELECT CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'announcements' 
    AND COLUMN_NAME = 'property_id'
    AND REFERENCED_TABLE_NAME IS NOT NULL
    LIMIT 1
);

SET @sql = IF(@fk_exists > 0 AND @fk_name IS NOT NULL,
    CONCAT('ALTER TABLE announcements DROP FOREIGN KEY ', @fk_name),
    'SELECT "No foreign key constraint found for property_id, skipping..." AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop the index (only if it exists)
SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'announcements' 
    AND INDEX_NAME = 'idx_property_id'
);

SET @sql = IF(@index_exists > 0,
    'ALTER TABLE announcements DROP INDEX idx_property_id',
    'SELECT "Index idx_property_id does not exist, skipping..." AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop the redundant column (only if it exists)
SET @sql = IF(@column_exists > 0,
    'ALTER TABLE announcements DROP COLUMN property_id',
    'SELECT "Column property_id does not exist, skipping..." AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
