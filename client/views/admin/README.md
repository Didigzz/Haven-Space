# Admin Views

Admin dashboard views for system administration and oversight.

## Structure

```
admin/
└── index.html    # Admin dashboard home (single-page with hash-based sections)
```

## Pages

### `index.html` - Admin Command Center

Main admin dashboard for system oversight and management with a distinct dark theme.

**Features:**

- **Command Center Overview**: Platform-wide statistics and quick metrics
- **Landlord Verification Queue**: Review, approve, or reject landlord applications with comments
- **User Management**: Search, filter, and manage boarder/landlord accounts (active/suspended/banned)
- **Property Moderation**: Review newly listed properties, publish/reject/flag suspicious listings
- **Application Oversight**: Monitor all rental applications with statistics and conversion rates
- **Analytics Dashboard**: Platform metrics, user growth, property performance charts
- **Reports & Disputes**: Handle user-reported issues and manage dispute resolution
- **System Settings**: Configure platform-wide settings, maintenance mode, terms/privacy versions

**Navigation:**

Uses hash-based routing (`#overview`, `#verification`, `#users`, `#properties`, `#applications`, `#analytics`, `#reports`, `#settings`)

**Authentication:**

- Requires admin role authentication guard
- Redirects non-admin users to login page
- Full RBAC (Role-Based Access Control) implementation

## Related Files

- **CSS:** `/css/views/admin/admin.css` - Dark command center theme with purple/indigo accents
- **JavaScript:** `/js/views/admin/admin-dashboard.js` - Panel logic and API integration
- **JavaScript:** `/js/views/admin/index.js` - Dashboard initialization and auth guard
- **Component:** `/components/sidebar.html` - Admin navigation sidebar
- **Component:** `/js/components/sidebar.js` - Admin navigation configuration
