# Boarder Onboarding Checklist

## Overview

The onboarding checklist is a guided overlay system that appears for boarders after their application has been accepted by a landlord. It helps new tenants complete essential setup steps before gaining full access to the dashboard.

## Features

### 1. **Automatic Detection**

- Automatically shows when a boarder's application status changes to "accepted"
- Only displays if onboarding steps are incomplete
- Tracks completion status in the database

### 2. **Required Steps**

1. ✅ **Application Accepted** (auto-checked)
2. 🔒 **Add Payment Method** (required)
3. 📝 **Complete Profile** (optional but encouraged)
4. 📋 **Read House Rules** (required)

### 3. **User Experience**

- **Modal Overlay**: Full-screen modal with checklist items
- **Progress Tracking**: Visual progress bar showing completion percentage
- **Persistent Banner**: Dismissible banner that reminds users to complete setup
- **Feature Locking**: Some features (like making payments) are locked until payment method is added

### 4. **Dismissible**

- Users can dismiss the overlay with "I'll do this later"
- Dismissed state is tracked in the database
- Persistent banner shows after dismissal until completion

## Database Schema

### Migration: `039_add_onboarding_checklist_to_boarder_profiles.sql`

Added to `boarder_profiles` table:

```sql
onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE
onboarding_payment_method_added BOOLEAN NOT NULL DEFAULT FALSE
onboarding_profile_completed BOOLEAN NOT NULL DEFAULT FALSE
onboarding_house_rules_read BOOLEAN NOT NULL DEFAULT FALSE
onboarding_dismissed_at TIMESTAMP NULL
```

## API Endpoints

### GET `/api/boarder/onboarding-status`

Returns the current onboarding status for the authenticated boarder.

**Response:**

```json
{
  "show_onboarding": true,
  "checklist": {
    "application_accepted": true,
    "payment_method_added": false,
    "profile_completed": false,
    "house_rules_read": false
  },
  "onboarding_completed": false,
  "dismissed_at": null
}
```

### POST `/api/boarder/update-onboarding`

Updates onboarding checklist status.

**Request Body:**

```json
{
  "action": "mark_payment_method_added" | "mark_profile_completed" | "mark_house_rules_read" | "dismiss" | "complete"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Onboarding status updated"
}
```

## Frontend Implementation

### Files Created

1. **CSS**: `client/css/components/onboarding-checklist.css`

   - Modal overlay styles
   - Checklist item styles
   - Progress bar styles
   - Persistent banner styles
   - Responsive design
   - Dark mode support

2. **JavaScript**: `client/js/components/onboarding-checklist.js`
   - OnboardingChecklist class
   - API integration
   - State management
   - Event handling

### Integration

The onboarding checklist is automatically initialized in the boarder dashboard:

```javascript
// In client/js/views/boarder/index.js
import onboardingChecklist from '../../components/onboarding-checklist.js';

// Initialize on main dashboard only
if (currentPath.includes('/boarder/index.html')) {
  await onboardingChecklist.init();
}
```

### HTML Integration

Add the CSS to the boarder dashboard HTML:

```html
<link rel="stylesheet" href="../../css/components/onboarding-checklist.css" />
```

## User Flow

### 1. Application Accepted

```
Landlord accepts application
    ↓
Boarder logs in
    ↓
Onboarding overlay appears automatically
```

### 2. Completing Steps

```
Click checklist item
    ↓
Navigate to relevant page (payment methods, profile, house rules)
    ↓
Complete the action
    ↓
Return to dashboard
    ↓
Checklist item marked as complete
```

### 3. Dismissing Overlay

```
Click "I'll do this later"
    ↓
Overlay closes
    ↓
Persistent banner appears at top of dashboard
    ↓
Click "Continue Setup" to reopen overlay
```

### 4. Completion

```
All required steps completed
    ↓
"Continue to Dashboard" button enabled
    ↓
Click button
    ↓
Overlay closes permanently
    ↓
Full dashboard access granted
```

## Feature Locking

### Payment Features

- **Locked until**: Payment method added
- **Affected features**:
  - Making rent payments
  - Viewing payment history
  - Setting up auto-pay

### Profile Features

- **Optional**: Profile completion is encouraged but not required
- **Benefits**:
  - Better landlord communication
  - Personalized experience
  - Improved trust

## Testing

### Test File

`test_onboarding_checklist.html` - Standalone test page for the onboarding UI

### Test Scenarios

1. **Show Overlay**: Displays the full modal with checklist
2. **Show Banner**: Displays the persistent banner
3. **Hide All**: Removes all onboarding UI

### Manual Testing Steps

1. Create a boarder account
2. Apply for a room
3. Have landlord accept the application
4. Log in as boarder
5. Verify onboarding overlay appears
6. Test each checklist item navigation
7. Test dismiss functionality
8. Verify banner appears after dismissal
9. Complete all required steps
10. Verify overlay doesn't appear again

## Customization

### Adding New Checklist Items

1. **Update Database Migration**:

```sql
ALTER TABLE boarder_profiles
ADD COLUMN onboarding_new_step BOOLEAN NOT NULL DEFAULT FALSE;
```

2. **Update API Endpoints**:

```php
// In onboarding-status.php
$checklist = [
    // ... existing items
    'new_step' => (bool)$profile['onboarding_new_step']
];

// In update-onboarding.php
case 'mark_new_step':
    $stmt = $pdo->prepare('
        UPDATE boarder_profiles
        SET onboarding_new_step = TRUE
        WHERE user_id = ?
    ');
    break;
```

3. **Update Frontend**:

```javascript
// In onboarding-checklist.js renderChecklistItems()
{
    id: 'new_step',
    title: 'New Step Title',
    description: 'Description of the new step',
    badge: 'required', // or 'optional'
    locked: false,
    action: './path/to/page.html'
}
```

### Styling Customization

All styles are in `client/css/components/onboarding-checklist.css`:

- **Colors**: Modify CSS variables at the top
- **Animations**: Adjust `@keyframes` at the bottom
- **Responsive**: Edit `@media` queries
- **Dark Mode**: Modify `@media (prefers-color-scheme: dark)`

## Best Practices

1. **Keep Required Steps Minimal**: Only mark truly essential steps as required
2. **Clear Descriptions**: Each step should have a clear, actionable description
3. **Easy Navigation**: Each item should link directly to the relevant page
4. **Progress Feedback**: Always show progress percentage
5. **Dismissible**: Allow users to dismiss and return later
6. **Mobile Friendly**: Ensure overlay works well on all screen sizes

## Troubleshooting

### Overlay Not Appearing

1. Check if boarder has accepted application:

```sql
SELECT * FROM applications WHERE boarder_id = ? AND status = 'accepted';
```

2. Check onboarding status:

```sql
SELECT * FROM boarder_profiles WHERE user_id = ?;
```

3. Check browser console for JavaScript errors

### Checklist Items Not Updating

1. Verify API endpoints are accessible
2. Check authentication token is valid
3. Verify database permissions
4. Check network tab for failed requests

### Banner Not Showing After Dismissal

1. Verify `onboarding_dismissed_at` is set in database
2. Check if all required steps are completed
3. Verify banner CSS is loaded

## Future Enhancements

- [ ] Add video tutorials for each step
- [ ] Implement step-by-step wizard mode
- [ ] Add gamification (badges, rewards)
- [ ] Send email reminders for incomplete onboarding
- [ ] Add analytics tracking for completion rates
- [ ] Implement A/B testing for different onboarding flows
- [ ] Add tooltips and help text
- [ ] Create mobile app version

## Related Files

- Migration: `functions/database/migrations/039_add_onboarding_checklist_to_boarder_profiles.sql`
- Schema: `functions/database/schema.sql` (boarder_profiles table)
- API Status: `functions/api/boarder/onboarding-status.php`
- API Update: `functions/api/boarder/update-onboarding.php`
- Routes: `functions/api/routes.php`
- CSS: `client/css/components/onboarding-checklist.css`
- JavaScript: `client/js/components/onboarding-checklist.js`
- Integration: `client/js/views/boarder/index.js`
- HTML: `client/views/boarder/index.html`
- Test: `test_onboarding_checklist.html`
