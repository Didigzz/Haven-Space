# Landlord JavaScript

JavaScript modules for landlord dashboard views.

## Files

| File                       | Description                           |
| -------------------------- | ------------------------------------- |
| `landlord.ts`              | Landlord dashboard home functionality |
| `landlord-listings.ts`     | Property listing management (CRUD)    |
| `landlord-applications.ts` | Application review and management     |
| `landlord-payments.ts`     | Payment tracking and recording        |
| `landlord-maintenance.ts`  | Maintenance request management        |

## Exports

```javascript
// landlord.ts
export function initLandlord() {}

// landlord-listings.ts
export function initLandlordListings() {}

// landlord-applications.ts
export function initLandlordApplications() {}

// landlord-payments.ts
export function initLandlordPayments() {}

// landlord-maintenance.ts
export function initLandlordMaintenance() {}
```

## Usage

```html
<!-- Dashboard home -->
<script type="module" src="../../../js/views/landlord/landlord.ts"></script>

<!-- Listings -->
<script type="module" src="../../../js/views/landlord/landlord-listings.ts"></script>

<!-- Applications -->
<script type="module" src="../../../js/views/landlord/landlord-applications.ts"></script>

<!-- Payments -->
<script type="module" src="../../../js/views/landlord/landlord-payments.ts"></script>

<!-- Maintenance -->
<script type="module" src="../../../js/views/landlord/landlord-maintenance.ts"></script>
```
