-- Add leave request tracking fields to applications table
-- This allows tracking the leave request lifecycle without immediately deleting the application

ALTER TABLE applications
ADD COLUMN leave_request_status ENUM('none', 'pending', 'approved', 'completed') DEFAULT 'none' AFTER status,
ADD COLUMN leave_request_date DATE NULL AFTER leave_request_status,
ADD COLUMN leave_request_reason VARCHAR(500) NULL AFTER leave_request_date,
ADD COLUMN intended_leave_date DATE NULL AFTER leave_request_reason;

-- Add index for querying leave requests
CREATE INDEX idx_applications_leave_request ON applications(leave_request_status, intended_leave_date);

-- Add comment to document the purpose
ALTER TABLE applications COMMENT = 'Applications table with leave request tracking. Leave requests go through: none -> pending -> approved -> completed';
