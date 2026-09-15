-- Run against existing installations before starting the updated API. Safe to rerun.
SET @favorite_template_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'favorite_movements' AND COLUMN_NAME = 'amount'),
  'SELECT 1',
  'ALTER TABLE favorite_movements ADD COLUMN amount DECIMAL(10,2) NULL DEFAULT NULL'
);
PREPARE favorite_template_stmt FROM @favorite_template_ddl;
EXECUTE favorite_template_stmt;
DEALLOCATE PREPARE favorite_template_stmt;

SET @favorite_template_ddl = IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'favorite_movements' AND COLUMN_NAME = 'usage_count'),
  'SELECT 1',
  'ALTER TABLE favorite_movements ADD COLUMN usage_count INT UNSIGNED NOT NULL DEFAULT 0'
);
PREPARE favorite_template_stmt FROM @favorite_template_ddl;
EXECUTE favorite_template_stmt;
DEALLOCATE PREPARE favorite_template_stmt;

