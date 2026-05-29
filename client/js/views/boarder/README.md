# Boarder JavaScript

JavaScript modules for boarder dashboard views.

## Files

| File                      | Description                                 |
| ------------------------- | ------------------------------------------- |
| `boarder.ts`              | Boarder dashboard home functionality        |
| `boarder-rooms.ts`        | Room browsing and details                   |
| `boarder-applications.ts` | Rental application submission and tracking  |
| `boarder-payments.ts`     | Payment viewing and processing              |
| `boarder-maintenance.ts`  | Maintenance request submission and tracking |

## Exports

```javascript
// boarder.ts
export function initBoarder() {}

// boarder-rooms.ts
export function initBoarderRooms() {}

// boarder-applications.ts
export function initBoarderApplications() {}

// boarder-payments.ts
export function initBoarderPayments() {}

// boarder-maintenance.ts
export function initBoarderMaintenance() {}
```

## Usage

```html
<!-- Dashboard home -->
<script type="module" src="../../../js/views/boarder/boarder.ts"></script>

<!-- Rooms -->
<script type="module" src="../../../js/views/boarder/boarder-rooms.ts"></script>

<!-- Applications -->
<script type="module" src="../../../js/views/boarder/boarder-applications.ts"></script>

<!-- Payments -->
<script type="module" src="../../../js/views/boarder/boarder-payments.ts"></script>

<!-- Maintenance -->
<script type="module" src="../../../js/views/boarder/boarder-maintenance.ts"></script>
```
