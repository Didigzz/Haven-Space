# Boarder Payment Color System

## Overview

The boarder payment pages now feature a comprehensive color system that provides visual feedback about payment status. This system emphasizes urgency through color coding, making it easy for boarders to understand their payment obligations at a glance.

## Color Scheme

### 🔴 Red - Overdue/Critical

**When:** Payment is past due date
**Usage:**

- Bill card left border (4px solid red)
- Status badges with red background
- Timeline markers with red fill
- Pulsing animation to draw attention
- "Overdue" text labels

**Visual Effects:**

- Gradient background: `rgba(239, 68, 68, 0.08)` to white
- Border: `rgba(239, 68, 68, 0.3)`
- Pulse animation on badges and markers
- Box shadow glow effect

### 🟠 Orange - Due Soon/Warning

**When:** Payment due within 7 days or due today
**Usage:**

- Bill card left border (4px solid orange)
- Status badges with orange background
- Timeline markers with orange fill
- "Due Soon" or "Due Today" labels
- Days remaining counter

**Visual Effects:**

- Gradient background: `rgba(245, 158, 11, 0.08)` to white
- Border: `rgba(245, 158, 11, 0.3)`
- Subtle glow on hover

### 🟢 Green - Paid/On Track

**When:** Payment is paid OR due date is more than 7 days away
**Usage:**

- Bill card left border (4px solid green)
- Status badges with green background
- Timeline markers with green fill
- "Paid" or "On Track" labels

**Visual Effects:**

- Gradient background: `rgba(34, 197, 94, 0.08)` to white
- Border: `rgba(34, 197, 94, 0.3)`
- Checkmark icons for paid status

## Components with Color System

### 1. Payment Page - Current Bill Card

**Location:** `client/views/boarder/payments.html`
**Features:**

- Left border color changes based on status
- Gradient background tint
- Status badge with matching color
- Date item highlighting
- Dynamic text color for time remaining

**CSS Classes:**

- `.payments-current-bill-card.status-red`
- `.payments-current-bill-card.status-orange`
- `.payments-current-bill-card.status-green`

### 2. Payment Page - Financial Overview Cards

**Location:** Next Payment card in financial overview grid
**Features:**

- Entire card gradient changes color
- Box shadow matches status color
- Trend text updates with urgency

**CSS Classes:**

- `.financial-card-gradient-2.status-red`
- `.financial-card-gradient-2.status-orange`
- `.financial-card-gradient-2.status-green`

### 3. Payment Page - Timeline History

**Location:** Payment history timeline
**Features:**

- Marker circles change color
- Status badges with color coding
- Pulse animation for overdue items
- Timeline connector line color

**CSS Classes:**

- `.timeline-marker.overdue` (red)
- `.timeline-marker.upcoming` (orange)
- `.timeline-marker.completed` (green)
- `.timeline-status.status-red/orange/green`

### 4. Dashboard - Payment Cards

**Location:** `client/views/boarder/dashboard.html`
**Features:**

- Left border accent color
- Gradient background tint
- Status badge color
- Days left counter color
- "Overdue" vs "Unpaid" labels

**CSS Classes:**

- `.boarder-payment-simple-card.status-red`
- `.boarder-payment-simple-card.status-orange`
- `.boarder-payment-simple-card.status-green`

## Status Logic

### JavaScript Implementation

**File:** `client/js/views/boarder/boarder-payments.ts`

```javascript
function getPaymentStatus(dueDate, paidDate) {
  // If paid → GREEN
  if (paidDate) return { status: 'paid', color: 'green' };

  // Calculate days until due
  const daysUntilDue = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

  // If overdue → RED
  if (daysUntilDue < 0) return { status: 'overdue', color: 'red' };

  // If due today → ORANGE
  if (daysUntilDue === 0) return { status: 'due-today', color: 'orange' };

  // If due within 7 days → ORANGE
  if (daysUntilDue <= 7) return { status: 'upcoming', color: 'orange' };

  // If due date > 7 days away → GREEN
  return { status: 'current', color: 'green' };
}
```

### Dashboard Enhanced Logic

**File:** `client/js/views/boarder/dashboard.ts`

Additional granularity for dashboard cards:

- **Overdue (< 0 days):** RED with "Overdue" badge
- **Very Urgent (≤ 3 days):** RED with "Unpaid" badge
- **Due Soon (4-7 days):** ORANGE with "Unpaid" badge
- **On Track (> 7 days):** GREEN with "Unpaid" badge

## Animations

### Pulse Animation (Overdue Items)

```css
@keyframes pulse-red {
  0%,
  100% {
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(239, 68, 68, 0.2);
  }
}
```

### Badge Pulse (Overdue)

```css
@keyframes pulse-badge {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(239, 68, 68, 0);
  }
}
```

## Accessibility

### Color Contrast

All color combinations meet WCAG AA standards:

- Red text on light red background: 4.5:1 contrast
- Orange text on light orange background: 4.5:1 contrast
- Green text on light green background: 4.5:1 contrast

### Additional Indicators

Colors are not the only indicator:

- Text labels ("Overdue", "Due Soon", "Paid")
- Icons (checkmarks, warning symbols)
- Numerical days remaining
- Border thickness and style

### Screen Reader Support

Status information is announced via:

- ARIA labels on status badges
- Semantic HTML structure
- Live region updates when status changes

## Auto-Update System

The color system automatically updates:

- **On page load:** Initial status calculation
- **Every minute:** Re-evaluation of all payment statuses
- **Real-time:** As dates change, colors update automatically

**Implementation:**

```javascript
// Apply colors on page load
applyPaymentStatusColors();

// Re-apply every minute to keep status updated
setInterval(applyPaymentStatusColors, 60000);
```

## Browser Support

The color system uses modern CSS features:

- CSS custom properties (variables)
- CSS gradients
- CSS animations
- Flexbox and Grid

**Supported Browsers:**

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+

## Future Enhancements

Potential improvements:

1. **Notification badges** - Show count of overdue payments in sidebar
2. **Email reminders** - Automated emails when status changes to orange/red
3. **SMS alerts** - Optional SMS for overdue payments
4. **Payment plan indicators** - Special colors for installment plans
5. **Grace period** - Yellow/amber color for grace period (1-3 days after due)
6. **Dark mode** - Adjusted color palette for dark theme

## Testing

To test the color system:

1. **Paid status:** Set `payment_date` to any date
2. **Overdue:** Set `due_date` to past date (e.g., 5 days ago)
3. **Due today:** Set `due_date` to today
4. **Due soon:** Set `due_date` to 3-7 days from now
5. **On track:** Set `due_date` to 10+ days from now

## Maintenance

When updating the color system:

1. Update CSS variables in `:root` if changing base colors
2. Update `getPaymentStatus()` function for logic changes
3. Update this documentation
4. Test all payment-related pages
5. Verify accessibility compliance
