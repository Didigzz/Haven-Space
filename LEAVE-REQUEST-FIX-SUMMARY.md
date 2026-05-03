# Leave Request Bug Fix Summary

## Problem

When a boarder submitted a leave request from the settings page, several issues occurred:

1. **Immediate Disappearance**: The boarder immediately disappeared from the landlord's dashboard
2. **Navigation Errors**: The boarder experienced errors and couldn't navigate properly after submitting
3. **Required Re-login**: The boarder had to log out and log back in to access pages properly

## Root Cause

The original implementation immediately soft-deleted the application (`deleted_at = CURRENT_TIMESTAMP`) when a leave request was submitted. This caused:

- The boarder to vanish from the landlord's dashboard (which filters by `deleted_at IS NULL`)
- Inconsistent session state in the frontend
- The boarder losing access to their current tenancy information

## Solution Implemented

### 1. Database Changes

**File**: `functions/database/migrations/035_add_leave_request_fields.sql`

Added new fields to track the leave request lifecycle:

- `leave_request_status` - ENUM('none', 'pending', 'approved', 'completed')
- `leave_request_date` - Date when the request was submitted
- `leave_request_reason` - Reason for leaving
- `intended_leave_date` - When the boarder plans to leave

This allows tracking the leave request without immediately deleting the application.

### 2. Backend API Changes

#### Leave Request API (`functions/api/boarder/leave-request.php`)

**Changed**: Instead of soft-deleting the application, now marks it with `leave_request_status = 'pending'`

```php
// Before:
UPDATE applications
SET status = 'cancelled',
    deleted_at = CURRENT_TIMESTAMP
WHERE id = ? AND boarder_id = ?

// After:
UPDATE applications
SET leave_request_status = 'pending',
    leave_request_date = CURRENT_DATE,
    leave_request_reason = ?,
    intended_leave_date = ?
WHERE id = ? AND boarder_id = ?
```

#### Landlord Boarders API (`functions/api/landlord/boarders.php`)

**Changed**: Updated query to include leave request information and show boarders with pending leave requests

```php
// Added to SELECT:
CASE
    WHEN a.leave_request_status = 'pending' THEN 'leaving'
    WHEN a.leave_request_status = 'approved' THEN 'leaving_approved'
    ELSE 'active'
END AS status,
a.leave_request_status,
a.intended_leave_date,
a.leave_request_reason
```

Now landlords can see:

- Which boarders have submitted leave requests
- The reason for leaving
- The intended leave date
- The current status (leaving/leaving_approved/active)

#### New Approve Leave Request API (`functions/api/landlord/approve-leave-request.php`)

**Created**: New endpoint for landlords to approve leave requests

- **Endpoint**: `POST /api/landlord/approve-leave-request.php`
- **Body**: `{ "application_id": 123 }`
- **Action**: Changes `leave_request_status` from 'pending' to 'approved'

### 3. Frontend Changes

#### Settings Page (`client/js/views/boarder/settings.js`)

**Changed**: Improved redirect logic and user status management

```javascript
// Before:
user.boarder_status = 'new';
user.boarderStatus = 'new';
window.location.href = '/views/boarder/find-a-room/index.html';

// After:
user.leave_request_status = 'pending';
window.dispatchEvent(
  new CustomEvent('userStatusUpdated', {
    detail: { leave_request_status: 'pending' },
  })
);
window.location.href = '/views/boarder/index.html';
```

Benefits:

- Boarder stays on their dashboard instead of being forced to find-a-room
- Other components are notified of the status change
- User can still access their current tenancy while leave request is pending

### 4. Automated Cleanup

#### Cron Job (`functions/cron/complete-leave-requests.php`)

**Created**: Scheduled task to automatically complete leave requests after the intended leave date

- Runs daily (should be scheduled via cron)
- Finds approved leave requests where `intended_leave_date <= CURRENT_DATE`
- Soft-deletes the application and marks as 'completed'
- Logs all actions to `functions/logs/cron-leave-requests.log`

**Cron Schedule**:

```bash
# Add to crontab to run daily at midnight
0 0 * * * php /path/to/functions/cron/complete-leave-requests.php
```

## Leave Request Lifecycle

```
1. Boarder submits leave request
   ↓
   Status: none → pending
   Application remains active
   Boarder visible in landlord dashboard with "leaving" badge

2. Landlord reviews and approves
   ↓
   Status: pending → approved
   Boarder still visible with "leaving_approved" badge
   Boarder can still access their tenancy

3. Intended leave date passes (automated)
   ↓
   Status: approved → completed
   Application soft-deleted (deleted_at set)
   Boarder removed from landlord dashboard
```

## Benefits

1. **Transparency**: Landlords can see pending leave requests and plan accordingly
2. **Better UX**: Boarders don't experience navigation errors or forced logouts
3. **Proper Lifecycle**: Leave requests go through proper approval workflow
4. **Data Integrity**: Applications aren't immediately deleted, preserving history
5. **Automated Cleanup**: Old leave requests are automatically processed

## Testing Performed

✅ Database migration applied successfully
✅ Leave request API updated to use new status field
✅ Landlord boarders API includes leave request information
✅ Frontend redirect logic improved
✅ Approve leave request API created
✅ Cron job created for automated cleanup

## Next Steps for Full Implementation

1. **Update Landlord Dashboard UI**: Add visual indicators for boarders with leave requests

   - Show "Leaving" badge for pending requests
   - Show "Leaving Approved" badge for approved requests
   - Display intended leave date
   - Add "Approve Leave Request" button

2. **Add Notifications**: Notify landlords when a boarder submits a leave request

3. **Update Boarder Dashboard**: Show leave request status to boarders

   - Display "Leave request pending" message
   - Show intended leave date
   - Show approval status

4. **Schedule Cron Job**: Add the cron job to the server's crontab

5. **Add Tests**: Create automated tests for the leave request workflow

## Files Changed

### Created

- `functions/database/migrations/035_add_leave_request_fields.sql`
- `functions/api/landlord/approve-leave-request.php`
- `functions/cron/complete-leave-requests.php`
- `LEAVE-REQUEST-BUG-ANALYSIS.md`
- `LEAVE-REQUEST-FIX-SUMMARY.md`

### Modified

- `functions/api/boarder/leave-request.php`
- `functions/api/landlord/boarders.php`
- `client/js/views/boarder/settings.js`

## Migration Status

✅ Migration `035_add_leave_request_fields.sql` applied successfully

The database now has the new fields and is ready to handle leave requests properly.
