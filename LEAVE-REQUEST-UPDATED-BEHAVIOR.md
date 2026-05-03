# Leave Request Updated Behavior

## Change Summary

Based on user requirements, the leave request behavior has been updated to immediately cancel the application and redirect the boarder to the find-a-room page.

## Previous Behavior (Lifecycle Approach)

The previous implementation used a lifecycle approach:

1. Boarder submits leave request → Status: `pending`
2. Landlord approves → Status: `approved`
3. Leave date passes → Status: `completed` (application deleted)

**Problem**: This kept the boarder in a "leaving" state and didn't allow them to immediately search for new rooms.

## New Behavior (Immediate Cancellation)

The updated implementation immediately cancels the application:

1. Boarder submits leave request → Application immediately cancelled and soft-deleted
2. Boarder redirected to find-a-room page after 2 seconds
3. Boarder can immediately search for and apply to new rooms

## Changes Made

### 1. Backend API (`functions/api/boarder/leave-request.php`)

**Updated**: Application is immediately cancelled and soft-deleted

```php
// Cancel the application immediately since the boarder is leaving
// This allows them to search for new rooms right away
$applicationId = $tenancy['application_id'];
$cancelApplicationQuery = "
    UPDATE applications
    SET status = 'cancelled',
        leave_request_status = 'completed',
        leave_request_date = CURRENT_DATE,
        leave_request_reason = ?,
        intended_leave_date = ?,
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND boarder_id = ?
";
```

**Key Points**:

- `status = 'cancelled'` - Marks the application as cancelled
- `leave_request_status = 'completed'` - Records that the leave request was processed
- `deleted_at = CURRENT_TIMESTAMP` - Soft-deletes the application
- Still stores `leave_request_reason` and `intended_leave_date` for historical records

### 2. Frontend (`client/js/views/boarder/settings.js`)

**Updated**: Redirect to find-a-room page instead of dashboard

```javascript
if (res.ok) {
  showToast('Leave request sent successfully. You can now search for a new room.', 'success');
  closeModal();
  leaveForm?.reset();

  // Update user data in localStorage to reflect that they are now searching for a new room
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  user.boarder_status = 'new';
  user.boarderStatus = 'new';
  localStorage.setItem('user', JSON.stringify(user));

  // Notify other components of the status change
  window.dispatchEvent(
    new CustomEvent('userStatusUpdated', {
      detail: { boarder_status: 'new' },
    })
  );

  // Redirect to find-a-room page after 2 seconds
  setTimeout(() => {
    window.location.href = '/views/boarder/find-a-room/index.html';
  }, 2000);
}
```

**Key Points**:

- Toast message updated to inform boarder they can search for new rooms
- User status set to 'new' (no longer has an active tenancy)
- Redirects to `/views/boarder/find-a-room/index.html` after 2 seconds
- Other components notified via `userStatusUpdated` event

## User Flow

### Step-by-Step Process

1. **Boarder navigates to Settings**

   - URL: `http://localhost/views/boarder/settings/index.html`
   - Clicks on "Leave Property" tab

2. **Boarder fills out leave request form**

   - Selects reason for leaving
   - Enters intended leave date (minimum 30 days from today)
   - Writes message to landlord

3. **Boarder submits leave request**

   - Clicks "Submit Leave Request" button
   - Confirmation modal appears

4. **Boarder confirms leave request**

   - Clicks "Confirm" in modal
   - API call made to `/api/boarder/leave-request`

5. **Backend processes request**

   - Sends message to landlord with leave request details
   - Immediately cancels and soft-deletes the application
   - Returns success response

6. **Frontend handles response**

   - Shows success toast: "Leave request sent successfully. You can now search for a new room."
   - Updates localStorage: `boarder_status = 'new'`
   - Waits 2 seconds
   - Redirects to: `http://localhost/views/boarder/find-a-room/index.html`

7. **Boarder can search for new rooms**
   - Boarder is now on the find-a-room page
   - Can browse and apply to new properties
   - No longer has an active tenancy

### Landlord Perspective

1. **Landlord receives message**

   - Message appears in their inbox with leave request details
   - Contains: boarder name, property name, reason, intended leave date, and message

2. **Boarder disappears from dashboard**

   - Boarder is immediately removed from the landlord's boarders list
   - Application is soft-deleted (`deleted_at IS NOT NULL`)

3. **Historical record preserved**
   - Application record still exists in database (soft-deleted)
   - Contains leave request reason and date for records
   - Can be queried for historical reporting

## Benefits

✅ **Immediate Freedom**: Boarder can search for new rooms right away
✅ **Clear Status**: Boarder status is 'new', not in limbo
✅ **Simple Flow**: No approval process needed
✅ **Historical Records**: Leave request details preserved in database
✅ **Landlord Notification**: Landlord receives message with all details
✅ **Clean Redirect**: 2-second delay allows boarder to see success message

## Testing Checklist

- [ ] Boarder can submit leave request from settings page
- [ ] Success toast appears with correct message
- [ ] After 2 seconds, boarder is redirected to find-a-room page
- [ ] Boarder can browse rooms on find-a-room page
- [ ] Boarder can apply to new rooms
- [ ] Boarder disappears from landlord's boarders list
- [ ] Landlord receives message with leave request details
- [ ] Application is soft-deleted in database
- [ ] Leave request details are preserved in database
- [ ] No navigation errors occur
- [ ] No need to log out and log back in

## Database State After Leave Request

```sql
-- Application record (soft-deleted)
SELECT
    id,
    boarder_id,
    landlord_id,
    room_id,
    status,                    -- 'cancelled'
    leave_request_status,      -- 'completed'
    leave_request_date,        -- Date request was submitted
    leave_request_reason,      -- Reason for leaving
    intended_leave_date,       -- When boarder planned to leave
    deleted_at,                -- CURRENT_TIMESTAMP (soft-deleted)
    updated_at                 -- CURRENT_TIMESTAMP
FROM applications
WHERE boarder_id = ? AND deleted_at IS NOT NULL;
```

## Files Modified

1. `functions/api/boarder/leave-request.php` - Immediate cancellation logic
2. `client/js/views/boarder/settings.js` - Redirect to find-a-room page

## Migration Notes

The database migration `035_add_leave_request_fields.sql` is still useful for:

- Storing historical leave request data
- Tracking leave request reasons and dates
- Potential future reporting and analytics

The lifecycle fields (`leave_request_status`) are now used to mark completed leave requests rather than tracking a multi-step approval process.
