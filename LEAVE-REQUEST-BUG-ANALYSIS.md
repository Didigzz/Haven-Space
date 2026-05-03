# Leave Request Bug Analysis

## Issue Summary

When a boarder submits a leave request from the settings page (`http://localhost/views/boarder/settings/index.html`), several issues occur:

1. **Navigation Issue**: After submitting the leave request, the boarder sees an error message instead of being redirected directly to the find-a-room page
2. **Requires Re-login**: The boarder must log out and log back in before they can access the find-a-room page properly
3. **Boarder Disappears from Dashboard**: The boarder immediately disappears from the landlord's dashboard after submitting the leave request

## Root Causes

### 1. Application Soft-Delete Timing Issue

**File**: `functions/api/boarder/leave-request.php` (Line 157-163)

```php
// Cancel/delete the application since the boarder is leaving
$applicationId = $tenancy['application_id'];
$cancelApplicationQuery = "
    UPDATE applications
    SET status = 'cancelled',
        updated_at = CURRENT_TIMESTAMP,
        deleted_at = CURRENT_TIMESTAMP
    WHERE id = ? AND boarder_id = ?
";
```

**Problem**: The application is immediately soft-deleted (`deleted_at` is set) when the leave request is submitted. This causes:

- The boarder to immediately disappear from the landlord's boarders list (which filters by `deleted_at IS NULL`)
- The boarder's status to become inconsistent with their actual tenancy state

### 2. Landlord Dashboard Query Filter

**File**: `functions/api/landlord/boarders.php` (Line 60-76)

```php
SELECT ...
FROM applications a
...
WHERE p.id = ?
  AND a.landlord_id = ?
  AND a.status      = 'accepted'
  AND a.deleted_at  IS NULL  -- This filter removes boarders who submitted leave requests
  AND u.deleted_at  IS NULL
```

**Problem**: The query filters out any applications where `deleted_at IS NOT NULL`, meaning boarders who submit leave requests immediately vanish from the dashboard, even though they haven't actually moved out yet.

### 3. Frontend Redirect Logic

**File**: `client/js/views/boarder/settings.js` (Line 424-429)

```javascript
// Redirect to find-a-room page after a short delay
setTimeout(() => {
  window.location.href = '/views/boarder/find-a-room/index.html';
}, 2000);
```

**Problem**: The redirect happens immediately after the API call succeeds, but:

- The user's session state might not be properly updated
- The boarder status in localStorage is set to 'new' but other parts of the application might still cache the old status
- Navigation guards or authentication checks might fail because the session is in an inconsistent state

### 4. User Status Update Issue

**File**: `client/js/views/boarder/settings.js` (Line 416-420)

```javascript
// Update user data in localStorage to reflect new status
const user = JSON.parse(localStorage.getItem('user') || '{}');
user.boarder_status = 'new';
user.boarderStatus = 'new';
localStorage.setItem('user', JSON.stringify(user));
```

**Problem**: The frontend updates the user status to 'new' in localStorage, but:

- This doesn't match the backend state (the application is cancelled, not new)
- Other components (sidebar, navbar) might not be notified of this change
- The session token might still contain old user data

## Recommended Fixes

### Fix 1: Implement Leave Request Status Instead of Immediate Deletion

Instead of immediately soft-deleting the application, add a `leave_request_status` field to track the leave request lifecycle:

**Database Migration** (new file: `functions/database/migrations/035_add_leave_request_fields.sql`):

```sql
-- Add leave request tracking fields to applications table
ALTER TABLE applications
ADD COLUMN leave_request_status ENUM('none', 'pending', 'approved', 'completed') DEFAULT 'none' AFTER status,
ADD COLUMN leave_request_date DATE NULL AFTER leave_request_status,
ADD COLUMN leave_request_reason VARCHAR(500) NULL AFTER leave_request_date,
ADD COLUMN intended_leave_date DATE NULL AFTER leave_request_reason;

-- Add index for querying leave requests
CREATE INDEX idx_applications_leave_request ON applications(leave_request_status, intended_leave_date);
```

**Update API** (`functions/api/boarder/leave-request.php`):

```php
// Instead of soft-deleting, mark as leave request pending
$updateApplicationQuery = "
    UPDATE applications
    SET leave_request_status = 'pending',
        leave_request_date = CURRENT_DATE,
        leave_request_reason = ?,
        intended_leave_date = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND boarder_id = ?
";
$stmt = $pdo->prepare($updateApplicationQuery);
$stmt->execute([$reason, $leaveDate, $applicationId, $boarderId]);
```

### Fix 2: Update Landlord Dashboard to Show Leave Requests

**Update Query** (`functions/api/landlord/boarders.php`):

```php
SELECT
    a.id            AS application_id,
    u.id            AS id,
    u.first_name,
    u.last_name,
    u.email,
    u.phone_number,
    f.file_url      AS avatar_url,
    a.room_id,
    r.title         AS room_title,
    r.price         AS rent,
    a.created_at    AS move_in_date,
    a.message       AS application_message,
    CASE
        WHEN a.leave_request_status = 'pending' THEN 'leaving'
        WHEN a.leave_request_status = 'approved' THEN 'leaving_approved'
        ELSE 'active'
    END             AS status,
    a.leave_request_status,
    a.intended_leave_date,
    a.leave_request_reason,
    'paid'          AS payment_status,
    NULL            AS deposit,
    15              AS payment_due_day,
    NULL            AS last_payment_date
FROM applications a
JOIN users u  ON a.boarder_id  = u.id
LEFT JOIN rooms r ON a.room_id = r.id
LEFT JOIN files f ON u.avatar_file_id = f.id
JOIN properties p ON r.property_id = p.id
WHERE p.id = ?
  AND a.landlord_id = ?
  AND a.status      = 'accepted'
  AND a.deleted_at  IS NULL
  AND u.deleted_at  IS NULL
ORDER BY a.created_at DESC
```

### Fix 3: Add Landlord Action to Approve Leave Request

Create a new API endpoint for landlords to approve leave requests:

**New File**: `functions/api/landlord/approve-leave-request.php`

```php
<?php
/**
 * Landlord Approve Leave Request API
 * Allows landlords to approve a boarder's leave request
 */

require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../../src/Core/bootstrap.php';
require_once __DIR__ . '/../../src/Shared/Helpers/ResponseHelper.php';
require_once __DIR__ . '/../middleware.php';

use App\Api\Middleware;
use App\Core\Database\Connection;

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$user = Middleware::authorize(['landlord']);
$landlordId = $user['user_id'];

$input = json_decode(file_get_contents('php://input'), true);

if (empty($input['application_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Application ID is required']);
    exit;
}

$applicationId = (int) $input['application_id'];

try {
    $pdo = Connection::getInstance()->getPdo();

    // Verify the application belongs to this landlord and has a pending leave request
    $checkQuery = "
        SELECT id, leave_request_status, intended_leave_date
        FROM applications
        WHERE id = ?
        AND landlord_id = ?
        AND leave_request_status = 'pending'
        AND deleted_at IS NULL
    ";

    $stmt = $pdo->prepare($checkQuery);
    $stmt->execute([$applicationId, $landlordId]);
    $application = $stmt->fetch();

    if (!$application) {
        http_response_code(404);
        echo json_encode(['error' => 'Leave request not found or already processed']);
        exit;
    }

    // Update leave request status to approved
    $updateQuery = "
        UPDATE applications
        SET leave_request_status = 'approved',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ";

    $stmt = $pdo->prepare($updateQuery);
    $stmt->execute([$applicationId]);

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Leave request approved successfully'
    ]);

} catch (Exception $e) {
    error_log("Approve leave request error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to approve leave request']);
}
```

### Fix 4: Improve Frontend Redirect Logic

**Update** (`client/js/views/boarder/settings.js`):

```javascript
if (res.ok) {
  showToast('Leave request sent successfully. Your landlord will be notified.', 'success');
  closeModal();
  leaveForm?.reset();

  // Update user data in localStorage to reflect leave request status
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  user.leave_request_status = 'pending';
  localStorage.setItem('user', JSON.stringify(user));

  // Notify other components of the status change
  window.dispatchEvent(
    new CustomEvent('userStatusUpdated', {
      detail: { leave_request_status: 'pending' },
    })
  );

  // Redirect to dashboard instead of find-a-room
  setTimeout(() => {
    window.location.href = '/views/boarder/index.html';
  }, 2000);
}
```

### Fix 5: Add Cron Job to Complete Leave Requests

Create a scheduled task to automatically complete leave requests after the intended leave date:

**New File**: `functions/cron/complete-leave-requests.php`

```php
<?php
/**
 * Complete Leave Requests Cron Job
 * Runs daily to soft-delete applications where the intended leave date has passed
 */

require_once __DIR__ . '/../src/Core/bootstrap.php';

use App\Core\Database\Connection;

try {
    $pdo = Connection::getInstance()->getPdo();

    // Find all approved leave requests where the intended leave date has passed
    $query = "
        UPDATE applications
        SET leave_request_status = 'completed',
            status = 'cancelled',
            deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE leave_request_status = 'approved'
        AND intended_leave_date <= CURRENT_DATE
        AND deleted_at IS NULL
    ";

    $stmt = $pdo->prepare($query);
    $stmt->execute();

    $count = $stmt->rowCount();
    error_log("Completed $count leave requests");

} catch (Exception $e) {
    error_log("Complete leave requests cron error: " . $e->getMessage());
}
```

## Implementation Priority

1. **High Priority**: Fix 1 (Database migration and API update) - Prevents boarders from disappearing immediately
2. **High Priority**: Fix 2 (Update landlord dashboard query) - Shows leave request status to landlords
3. **Medium Priority**: Fix 4 (Improve frontend redirect) - Better user experience
4. **Medium Priority**: Fix 3 (Landlord approval endpoint) - Allows landlords to manage leave requests
5. **Low Priority**: Fix 5 (Cron job) - Automates cleanup after leave date

## Testing Checklist

- [ ] Boarder can submit leave request without errors
- [ ] Boarder remains visible in landlord dashboard with "leaving" status
- [ ] Landlord can see leave request details (reason, date)
- [ ] Landlord can approve leave request
- [ ] After approval, boarder status changes to "leaving_approved"
- [ ] After intended leave date, application is automatically soft-deleted
- [ ] Boarder can still access their dashboard while leave request is pending
- [ ] Messages between boarder and landlord work correctly during leave request period
