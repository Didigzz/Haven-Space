# Leave Request Fix - Implementation Summary

## Problem Statement

After a boarder leaves a property from the find-a-room page, they should:

1. No longer have an active application (application should be cancelled)
2. Have their boarder status reset to 'new' so they can browse and apply again
3. Be redirected to the applications dashboard instead of the main boarder dashboard
4. When clicking Profile or Settings, they should navigate to the applications dashboard

## Changes Made

### 1. Backend API Update (`functions/api/boarder/leave-request.php`)

**Added application cancellation logic:**

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
$stmt = $pdo->prepare($cancelApplicationQuery);
$stmt->execute([$applicationId, $boarderId]);
```

**Added boarder status reset:**

```php
// Reset boarder status to 'new' so they can browse and apply again
$updateBoarderStatusQuery = "
    UPDATE users
    SET boarder_status = 'new',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
";
$stmt = $pdo->prepare($updateBoarderStatusQuery);
$stmt->execute([$boarderId]);
```

**Updated API response to include new status:**

```php
'data' => [
    'conversation_id' => $conversationId,
    'message_id' => $messageId,
    'landlord_name' => $tenancy['landlord_first_name'] . ' ' . $tenancy['landlord_last_name'],
    'property_name' => $propertyName,
    'leave_date' => $leaveDateFormatted,
    'boarder_status' => 'new'  // Added
]
```

### 2. Frontend Settings Update (`client/js/views/boarder/settings.js`)

**Updated leave request handler:**

- Changed success message to clarify application cancellation
- Updated localStorage to reflect new boarder status
- Changed redirect from find-a-room to applications-dashboard

```javascript
if (res.ok) {
  showToast('Leave request sent successfully. Your application has been cancelled.', 'success');
  closeModal();
  leaveForm?.reset();

  // Update user data in localStorage to reflect new status
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  user.boarder_status = 'new';
  user.boarderStatus = 'new';
  localStorage.setItem('user', JSON.stringify(user));

  // Redirect to applications dashboard after a short delay
  setTimeout(() => {
    window.location.href = '/views/boarder/applications-dashboard/index.html';
  }, 2000);
}
```

### 3. Find-a-Room Navigation Update (`client/js/views/boarder/boarder-find-a-room-init.js`)

**Added Settings menu handler:**

- Added event listener for settings menu item
- Checks boarder status before navigation
- Redirects to applications dashboard if not accepted

```javascript
// Handle settings menu item click - route to appropriate page based on status
const profileMenuSettings = document.getElementById('profile-menu-settings');
if (profileMenuSettings) {
  profileMenuSettings.addEventListener('click', e => {
    e.preventDefault();
    profileDropdownMenu.classList.remove('show');

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'boarder') {
      const boarderStatus = user.boarder_status || user.boarderStatus || 'new';

      if (boarderStatus === 'accepted') {
        window.location.href = '../settings/index.html';
      } else {
        window.location.href = '../applications-dashboard/index.html';
      }
    } else {
      window.location.href = '../settings/index.html';
    }
  });
}
```

### 4. Navbar Component Update (`client/js/components/navbar.js`)

**Updated Profile and Settings handlers:**

- Added boarder status checks before navigation
- Redirects non-accepted boarders to applications dashboard
- Maintains existing behavior for accepted boarders and other roles

```javascript
// Profile menu item
const profileBtn = document.getElementById('navbar-menu-profile');
if (profileBtn) {
  profileBtn.addEventListener('click', e => {
    e.preventDefault();
    closeUserMenu();

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role === 'boarder') {
      const boarderStatus = user.boarder_status || user.boarderStatus || 'new';

      if (boarderStatus === 'accepted') {
        window.location.href = '../settings/index.html#profile';
      } else {
        window.location.href = '../applications-dashboard/index.html';
      }
    } else {
      window.dispatchEvent(new CustomEvent('navbar:user:profile:click'));
    }
  });
}
```

## Flow After Leave Request

1. **Boarder submits leave request** → API receives request
2. **API processes leave:**
   - Sends message to landlord
   - Cancels application (status = 'cancelled', deleted_at = NOW)
   - Resets boarder status to 'new'
   - Returns success with new status
3. **Frontend receives response:**
   - Updates localStorage with new status
   - Shows success toast
   - Redirects to applications dashboard
4. **Boarder is now in applications dashboard:**
   - No active application
   - Can browse properties
   - Can apply to new properties
   - Profile/Settings clicks go to applications dashboard

## Testing Checklist

- [ ] Boarder can submit leave request from settings
- [ ] Application is cancelled after leave request
- [ ] Boarder status is reset to 'new'
- [ ] Boarder is redirected to applications dashboard
- [ ] No application shows in find-a-room page
- [ ] Profile click from find-a-room goes to applications dashboard
- [ ] Settings click from find-a-room goes to applications dashboard
- [ ] Boarder can browse and apply to new properties
- [ ] Main boarder dashboard is inaccessible (redirects to applications dashboard)

## Database Schema Impact

### Tables Modified:

1. **applications** - status set to 'cancelled', deleted_at timestamp added
2. **users** - boarder_status reset to 'new'

### No Schema Changes Required

All changes use existing columns and follow the current database structure.

## Notes

- The leave request still sends a message to the landlord as before
- The application is soft-deleted (deleted_at timestamp) rather than hard-deleted
- The boarder can immediately start browsing and applying to new properties
- The sidebar navigation automatically adjusts based on boarder status
- All navigation guards check boarder status before allowing access to main dashboard

## Deployment

1. Deploy backend changes (`functions/api/boarder/leave-request.php`)
2. Deploy frontend changes (settings.js, boarder-find-a-room-init.js, navbar.js)
3. Test the complete flow on production
4. Monitor for any issues with status transitions

## Future Enhancements

- Add a "Leave History" section to track past leave requests
- Send notification to boarder when leave request is acknowledged
- Add ability for landlord to approve/deny leave requests
- Implement grace period before application is fully cancelled
