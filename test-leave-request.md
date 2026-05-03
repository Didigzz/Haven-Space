# Leave Request Testing Guide

## Manual Testing Steps

### Prerequisites

- Have a boarder account with an active tenancy (accepted application)
- Know the boarder credentials (e.g., katgee@gmail.com)
- Have the landlord credentials for verification (e.g., amlhungrykat@gmail.com)

### Test Scenario: Boarder Submits Leave Request

#### Step 1: Login as Boarder

1. Navigate to `http://localhost/views/public/auth/login.html`
2. Login with boarder credentials (katgee@gmail.com)
3. Verify you're redirected to the boarder dashboard

#### Step 2: Navigate to Settings

1. Click on your profile/avatar in the top right
2. Click "Settings" or navigate directly to `http://localhost/views/boarder/settings/index.html`
3. Click on the "Leave Property" tab

#### Step 3: Fill Out Leave Request Form

1. **Reason for Leaving**: Select a reason from dropdown (or "Other" and enter custom reason)
2. **Intended Leave Date**: Enter a date at least 30 days from today
   - Example: If today is May 4, 2026, enter June 4, 2026 or later
3. **Message to Landlord**: Write a message explaining your situation
   - Example: "I need to relocate for work. Thank you for your hospitality."

#### Step 4: Submit Leave Request

1. Click "Submit Leave Request" button
2. **Expected**: Confirmation modal appears
3. Review the details in the modal
4. Click "Confirm" button

#### Step 5: Verify Success Response

1. **Expected**: Success toast appears with message:
   - "Leave request sent successfully. You can now search for a new room."
2. **Expected**: Toast is visible for ~2 seconds
3. **Expected**: After 2 seconds, automatic redirect to:
   - `http://localhost/views/boarder/find-a-room/index.html`

#### Step 6: Verify Find-a-Room Page

1. **Expected**: You are now on the find-a-room page
2. **Expected**: You can see available rooms
3. **Expected**: You can browse and search for rooms
4. **Expected**: No errors in browser console (F12 → Console tab)

#### Step 7: Verify Boarder Can Apply to New Rooms

1. Click on any available room
2. **Expected**: Room detail page loads correctly
3. **Expected**: "Apply Now" button is visible and clickable
4. Try applying to a room
5. **Expected**: Application can be submitted successfully

### Test Scenario: Landlord Verification

#### Step 1: Login as Landlord

1. Open a new browser window or incognito window
2. Navigate to `http://localhost/views/public/auth/login.html`
3. Login with landlord credentials (amlhungrykat@gmail.com)

#### Step 2: Check Boarders List

1. Navigate to the property's boarders page
2. **Expected**: The boarder who submitted the leave request is NO LONGER in the list
3. **Expected**: The boarder has been removed from the active boarders

#### Step 3: Check Messages

1. Navigate to Messages/Inbox
2. **Expected**: New message from the boarder with leave request details
3. **Expected**: Message contains:
   - "🏠 LEAVE REQUEST" header
   - Boarder name
   - Property name
   - Reason for leaving
   - Intended leave date
   - Custom message from boarder

### Test Scenario: Database Verification

#### Check Application Status

```sql
-- Find the cancelled application
SELECT
    id,
    boarder_id,
    landlord_id,
    room_id,
    status,
    leave_request_status,
    leave_request_date,
    leave_request_reason,
    intended_leave_date,
    deleted_at,
    updated_at
FROM applications
WHERE boarder_id = [BOARDER_USER_ID]
ORDER BY updated_at DESC
LIMIT 1;
```

**Expected Results**:

- `status` = 'cancelled'
- `leave_request_status` = 'completed'
- `leave_request_date` = today's date
- `leave_request_reason` = the reason entered
- `intended_leave_date` = the date entered
- `deleted_at` = timestamp (not NULL)

#### Check Message Created

```sql
-- Find the leave request message
SELECT
    m.id,
    m.conversation_id,
    m.sender_id,
    m.message_text,
    m.created_at
FROM messages m
WHERE m.sender_id = [BOARDER_USER_ID]
AND m.message_text LIKE '%LEAVE REQUEST%'
ORDER BY m.created_at DESC
LIMIT 1;
```

**Expected Results**:

- Message exists
- `message_text` contains leave request details
- `sender_id` matches boarder user ID

## Common Issues and Solutions

### Issue 1: "No active tenancy found" Error

**Cause**: Boarder doesn't have an accepted application
**Solution**:

1. Login as landlord
2. Accept a pending application from the boarder
3. Try submitting leave request again

### Issue 2: "Please provide at least 30 days notice" Error

**Cause**: Intended leave date is less than 30 days from today
**Solution**: Enter a date at least 30 days in the future

### Issue 3: Redirect Doesn't Happen

**Cause**: JavaScript error or browser blocking redirect
**Solution**:

1. Check browser console for errors (F12 → Console)
2. Check if popup blocker is preventing redirect
3. Manually navigate to find-a-room page

### Issue 4: Boarder Still Shows in Landlord Dashboard

**Cause**: Application wasn't properly soft-deleted
**Solution**:

1. Check database: `SELECT * FROM applications WHERE boarder_id = ? AND deleted_at IS NULL`
2. If application still exists without `deleted_at`, there's a backend issue
3. Check API logs for errors

## Browser Console Checks

### Expected Console Output (No Errors)

```
✓ No red error messages
✓ API call to /api/boarder/leave-request returns 200
✓ Redirect happens after 2 seconds
```

### Check Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Submit leave request
4. Look for `/api/boarder/leave-request` request
5. **Expected**: Status 200 OK
6. **Expected**: Response contains `"success": true`

## Automated Testing (Future)

### Playwright Test Script

```javascript
test('boarder can submit leave request and redirect to find-a-room', async ({ page }) => {
  // Login as boarder
  await page.goto('http://localhost/views/public/auth/login.html');
  // ... login steps ...

  // Navigate to settings
  await page.goto('http://localhost/views/boarder/settings/index.html');
  await page.click('[data-tab="leave-property"]');

  // Fill form
  await page.selectOption('#leave-reason', 'Relocating');
  await page.fill('#intended-leave-date', '2026-06-15');
  await page.fill('#leave-message', 'Test leave request');

  // Submit
  await page.click('button:has-text("Submit Leave Request")');
  await page.click('button:has-text("Confirm")');

  // Wait for redirect
  await page.waitForURL('**/find-a-room/index.html', { timeout: 5000 });

  // Verify on find-a-room page
  expect(page.url()).toContain('find-a-room');
});
```

## Success Criteria

✅ Boarder can submit leave request without errors
✅ Success toast appears with correct message
✅ Automatic redirect to find-a-room page after 2 seconds
✅ Boarder can browse and apply to new rooms
✅ Boarder disappears from landlord's boarders list
✅ Landlord receives message with leave request details
✅ Application is soft-deleted in database
✅ No JavaScript errors in console
✅ No need to log out and log back in
