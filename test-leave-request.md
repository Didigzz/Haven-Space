# Manual Testing Guide for Leave Request Feature

## Prerequisites

- Boarder account with an accepted application (boarder_status = 'accepted')
- Access to both localhost and production environments

## Test Scenario 1: Leave Request Submission

### Steps:

1. Login as boarder with accepted application
2. Navigate to Settings page
3. Scroll to "Leave Property" section
4. Fill in leave request form:
   - Reason: "Moving to another city"
   - Leave Date: Select a future date
   - Message: "Thank you for the accommodation"
5. Click "Submit Leave Request"
6. Confirm in modal

### Expected Results:

- ✅ Success toast: "Leave request sent successfully. Your application has been cancelled."
- ✅ Redirect to applications dashboard after 2 seconds
- ✅ No active application visible
- ✅ Boarder status = 'new' in localStorage

### Database Verification:

```sql
-- Check application status
SELECT id, boarder_id, status, deleted_at
FROM applications
WHERE boarder_id = [BOARDER_ID];
-- Expected: status = 'cancelled', deleted_at = NOW

-- Check boarder status
SELECT id, email, boarder_status
FROM users
WHERE id = [BOARDER_ID];
-- Expected: boarder_status = 'new'
```

## Test Scenario 2: Navigation After Leave

### Steps:

1. After leaving (from Test Scenario 1)
2. Navigate to find-a-room page
3. Click on Profile dropdown
4. Click "Profile" or "Settings"

### Expected Results:

- ✅ Redirects to applications dashboard
- ✅ Does NOT go to main boarder dashboard
- ✅ Does NOT go to main settings page

## Test Scenario 3: Applications Dashboard Access

### Steps:

1. After leaving (from Test Scenario 1)
2. Try to access main boarder dashboard directly:
   - `http://localhost/views/boarder/index.html`

### Expected Results:

- ✅ Automatically redirects to applications dashboard
- ✅ Shows "No Applications Yet" or similar empty state
- ✅ Can browse properties
- ✅ Can apply to new properties

## Test Scenario 4: Sidebar Navigation

### Steps:

1. After leaving (from Test Scenario 1)
2. Check sidebar navigation items

### Expected Results:

- ✅ Shows limited navigation (pre-acceptance menu)
- ✅ Shows: Applications Dashboard, Find a Room, Settings
- ✅ Does NOT show: Dashboard, My Tenancy, Messages, Payments, etc.

## Test Scenario 5: Re-applying After Leave

### Steps:

1. After leaving (from Test Scenario 1)
2. Navigate to find-a-room page
3. Browse properties
4. Apply to a new property

### Expected Results:

- ✅ Can submit new application
- ✅ Application status = 'pending'
- ✅ Boarder status updates to 'applied_pending'
- ✅ Shows in applications dashboard

## Test Scenario 6: Landlord Receives Leave Request

### Steps:

1. Login as landlord
2. Navigate to Messages
3. Check for leave request message

### Expected Results:

- ✅ Message received from boarder
- ✅ Message contains:
  - Boarder name
  - Property name
  - Reason for leaving
  - Intended leave date
  - Custom message
- ✅ Message marked as unread

## Browser Console Checks

### After Leave Request:

```javascript
// Check localStorage
const user = JSON.parse(localStorage.getItem('user'));
console.log('Boarder Status:', user.boarder_status); // Should be 'new'
console.log('User:', user);
```

## API Response Verification

### Leave Request API Response:

```json
{
  "success": true,
  "message": "Leave request sent to landlord successfully",
  "data": {
    "conversation_id": 123,
    "message_id": 456,
    "landlord_name": "John Doe",
    "property_name": "Sample Property",
    "leave_date": "May 15, 2026",
    "boarder_status": "new"
  }
}
```

## Edge Cases to Test

### 1. Leave Request Without Active Tenancy

- Try to submit leave request when boarder_status != 'accepted'
- Expected: Error message "No active tenancy found"

### 2. Multiple Leave Requests

- Submit leave request
- Try to submit another leave request immediately
- Expected: Error message "No active tenancy found"

### 3. Network Failure

- Simulate network failure during leave request
- Expected: Error toast, no status change, can retry

### 4. Concurrent Sessions

- Open two browser tabs
- Submit leave request in one tab
- Try to access main dashboard in other tab
- Expected: Redirect to applications dashboard

## Rollback Plan

If issues are found:

1. Revert backend changes in `functions/api/boarder/leave-request.php`
2. Revert frontend changes in:
   - `client/js/views/boarder/settings.js`
   - `client/js/views/boarder/boarder-find-a-room-init.js`
   - `client/js/components/navbar.js`
3. Manually update affected boarder records in database:
   ```sql
   UPDATE users SET boarder_status = 'accepted' WHERE id = [BOARDER_ID];
   UPDATE applications SET status = 'accepted', deleted_at = NULL WHERE id = [APP_ID];
   ```

## Success Criteria

All test scenarios pass with expected results:

- [ ] Leave request submission works
- [ ] Application is cancelled
- [ ] Boarder status is reset
- [ ] Navigation redirects correctly
- [ ] Sidebar shows correct menu
- [ ] Can re-apply to properties
- [ ] Landlord receives message
- [ ] No console errors
- [ ] No database inconsistencies
