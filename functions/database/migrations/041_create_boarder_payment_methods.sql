-- Migration: Create payment_methods_boarder table
-- Date: 2026-06-01
-- Reason: Store boarder payment methods (GCash, bank transfer, credit card) for real CRUD
-- Note: This table was later renamed to payment_methods_boarder in migration 042

CREATE TABLE IF NOT EXISTS boarder_payment_methods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    method_type VARCHAR(50) NOT NULL COMMENT 'gcash | bank | card',
    name VARCHAR(255) NOT NULL COMMENT 'Display name e.g. GCash, BDO Bank Transfer',
    last_four VARCHAR(10) NOT NULL DEFAULT '' COMMENT 'Last 4 digits of account/card/number',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);
