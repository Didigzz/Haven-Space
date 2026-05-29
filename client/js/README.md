# Haven Space - JavaScript Modules

ES Modules for application logic and component initialization.

## Directory Structure

```
js/
├── main.ts                  # Application entry point
├── auth/                    # Authentication logic
│   ├── login.ts             # Login page functionality
│   ├── signup.ts            # Signup page functionality
│   └── forgot-password.ts   # Password recovery functionality
├── components/              # Reusable component initialization
│   ├── logo-cloud.ts        # Infinite logo slider
│   └── sidebar.ts           # Dashboard sidebar navigation
├── shared/                  # Shared utilities
│   └── state.ts             # State management, auth helpers, API utilities
└── views/                   # View-specific logic (nested by type)
    ├── admin/
    │   └── admin.ts
    ├── boarder/
    │   ├── boarder.ts
    │   ├── boarder-applications.ts
    │   ├── boarder-maintenance.ts
    │   ├── boarder-payments.ts
    │   └── boarder-rooms.ts
    ├── landing/
    │   └── landing.ts
    ├── landlord/
    │   ├── landlord.ts
    │   ├── landlord-applications.ts
    │   ├── landlord-listings.ts
    │   ├── landlord-maintenance.ts
    │   └── landlord-payments.ts
    └── public/              # Reserved for public view logic
```

## Usage

Include in HTML as a module:

```html
<script type="module" src="./js/main.ts"></script>
```

## Entry Point (`main.ts`)

The main entry point initializes all components and handles global functionality:

```javascript
import { initLogoCloud } from './components/logo-cloud.ts';
import { initSidebar } from './components/sidebar.ts';

document.addEventListener('DOMContentLoaded', () => {
  initLogoCloud();
  initFloatingHeader();
  initSidebar({
    role: 'boarder',
    user: {
      name: 'Juan Dela Cruz',
      initials: 'JD',
      role: 'Boarder',
    },
  });
});
```

### Functions

| Function               | Description                                           |
| ---------------------- | ----------------------------------------------------- |
| `initLogoCloud()`      | Initializes the infinite logo slider animation        |
| `initSidebar(config)`  | Initializes dashboard sidebar with user configuration |
| `initFloatingHeader()` | Handles scroll-triggered header transition effects    |

## Modules

### Authentication (`auth/`)

| Module               | Description                                      |
| -------------------- | ------------------------------------------------ |
| `login.ts`           | Login form handling, validation, social sign-in  |
| `signup.ts`          | Signup form handling, role selection, validation |
| `forgot-password.ts` | Password recovery flow, email submission         |

### Components (`components/`)

Reusable component initialization functions:

| Module          | Description                    | Exports               |
| --------------- | ------------------------------ | --------------------- |
| `logo-cloud.ts` | Infinite logo slider animation | `initLogoCloud()`     |
| `sidebar.ts`    | Dashboard sidebar navigation   | `initSidebar(config)` |

### Shared (`shared/`)

| Module     | Description                                                                     |
| ---------- | ------------------------------------------------------------------------------- |
| `state.ts` | Application state, authentication helpers, API fetch wrapper, utility functions |

### Views (`views/`)

View-specific logic organized by dashboard type:

#### Admin (`views/admin/`)

| Module     | Description                   |
| ---------- | ----------------------------- |
| `admin.ts` | Admin dashboard functionality |

#### Boarder (`views/boarder/`)

| Module                    | Description                                 |
| ------------------------- | ------------------------------------------- |
| `boarder.ts`              | Boarder dashboard home                      |
| `boarder-rooms.ts`        | Room browsing and details                   |
| `boarder-applications.ts` | Rental application submission and tracking  |
| `boarder-payments.ts`     | Payment viewing and processing              |
| `boarder-maintenance.ts`  | Maintenance request submission and tracking |

#### Landing (`views/landing/`)

| Module       | Description                              |
| ------------ | ---------------------------------------- |
| `landing.ts` | Landing page interactions and animations |

#### Landlord (`views/landlord/`)

| Module                     | Description                        |
| -------------------------- | ---------------------------------- |
| `landlord.ts`              | Landlord dashboard home            |
| `landlord-listings.ts`     | Property listing management (CRUD) |
| `landlord-applications.ts` | Application review and management  |
| `landlord-payments.ts`     | Payment tracking and recording     |
| `landlord-maintenance.ts`  | Maintenance request management     |

## Module Pattern

Each module exports specific functions:

```javascript
// components/logo-cloud.ts
export function initLogoCloud() {
  // Component initialization logic
}

// views/boarder/boarder-rooms.ts
export function initBoarderRooms() {
  // View initialization logic
}
```

## Development

Run with a local server (ES modules require HTTP):

```bash
npx http-server client
# or
python -m http.server 3000
# or
bun run --hot
```

## Guidelines

- Use `const` by default, `let` for reassignable variables
- Use arrow functions for callbacks and anonymous functions
- Wrap DOM-dependent code in `DOMContentLoaded` listener
- Use descriptive variable and function names
- Keep modules focused on single responsibility
- Import only what you need from other modules
