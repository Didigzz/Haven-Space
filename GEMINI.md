# Haven Space - Project Context

## Project Overview

**Haven Space** is a web application that connects boarders with verified boarding houses near their location. The platform serves two user types:

- **Landlords**: Property owners looking for boarders
- **Boarders**: Individuals seeking rooms/boarding houses

The application provides property listings, booking management, and a mobile-friendly experience for searching and settling into boarding accommodations.

## Technology Stack

| Category            | Technology                                        |
| ------------------- | ------------------------------------------------- |
| **Frontend**        | HTML5, CSS3, Vanilla JavaScript (ES6+)            |
| **Backend**         | PHP 8.0+ with MySQL/MariaDB                       |
| **Configuration**   | Environment-based (.env)                          |
| **Authentication**  | JWT with Access/Refresh Tokens (httpOnly cookies) |
| **Fonts**           | Plus Jakarta Sans (Google Fonts)                  |
| **Styling**         | Custom CSS with CSS custom properties (variables) |
| **Code Formatting** | Prettier                                          |
| **Deployment**      | GitHub Pages                                      |
| **CI/CD**           | GitHub Actions                                    |

## Project Structure

```
Final/
├── .github/
│   ├── CONTRIBUTING.md          # Contribution guidelines
│   ├── pull_request_template.md # PR template
│   └── workflows/
│       ├── github-pages.yml     # Deployment workflow
│       └── prettier-check.yml   # Code formatting check
├── client/                      # Frontend source files (renamed from frontend/)
│   ├── assets/
│   │   ├── images/              # Image assets (logos, illustrations)
│   │   ├── svg/                 # SVG icons
│   │   └── README.md
│   ├── components/              # Reusable HTML components
│   │   ├── logo-cloud.html      # Infinite logo slider
│   │   ├── sidebar.html         # Dashboard sidebar navigation
│   │   └── navbar.html          # Top navigation bar
│   ├── css/
│   │   ├── components/          # Component-specific styles
│   │   │   ├── logo-cloud.css   # Logo cloud slider styles
│   │   │   ├── sidebar.css      # Sidebar navigation styles
│   │   │   └── navbar.css       # Navbar styles
│   │   ├── views/               # Page-specific styles (nested by view type)
│   │   │   ├── admin/
│   │   │   ├── boarder/
│   │   │   ├── landlord/
│   │   │   └── public/
│   │       ├── auth.css
│   │       └── public.css
│   │   ├── global.css           # Global styles & CSS variables
│   │   └── README.md
│   ├── js/
│   │   ├── auth/                # Authentication logic
│   │   │   ├── forgot-password.js
│   │   │   ├── login.js
│   │   │   └── signup.js
│   │   ├── components/          # Component logic
│   │   │   ├── logo-cloud.js
│   │   │   ├── sidebar.js
│   │   │   └── navbar.js
│   │   ├── shared/              # Shared utilities
│   │   │   └── state.js
│   │   ├── views/               # Page-specific logic (nested by view type)
│   │   │   ├── admin/
│   │   │   ├── boarder/
│   │   │   ├── landlord/
│   │   │   └── public/
│   │   ├── main.js              # Entry point & Auth Guard
│   │   └── README.md
│   ├── views/
│   │   ├── admin/               # Admin dashboard views
│   │   │   └── index.html
│   │   ├── boarder/             # Boarder dashboard views
│   │   │   ├── applications/    # Rental applications
│   │   │   ├── index.html       # Boarder dashboard home
│   │   │   ├── maintenance/     # Maintenance requests
│   │   │   ├── messages/        # Messaging system
│   │   │   ├── notices/         # Notices/announcements
│   │   │   ├── payments/        # Payment management
│   │   │   ├── profile/         # User profile
│   │   │   ├── rooms/           # Room browsing
│   │   └── public/              # Public-facing views
│   │       ├── auth/            # Authentication pages
│   │       │   ├── login.html
│   │       │   ├── signup.html
│   │       │   └── forgot-password.html
│   │       ├── index.html       # Public homepage
│   │       └── maps.html        # Map view
│   ├── index.html               # Root redirect to views/public/index.html
│   └── README.md
├── server/                      # Backend API (PHP)
│   ├── api/
│   │   ├── auth/                # Auth endpoints
│   │   │   ├── login.php
│   │   │   ├── register.php
│   │   │   ├── me.php           # Verify session
│   │   │   ├── refresh-token.php # Issue new access tokens
│   │   │   └── logout.php       # Clear auth cookies
│   │   ├── cors.php             # CORS configuration
│   │   ├── middleware.php       # Auth middleware
│   │   └── ...
│   ├── src/                     # Source files
│   │   ├── Core/
│   │   │   ├── bootstrap.php    # App initialization
│   │   │   ├── Env.php          # .env loader
│   │   │   ├── Auth/
│   │   │   │   ├── JWT.php      # JWT handler
│   │   │   │   └── RateLimiter.php # Login rate limiting
│   │   │   └── ...
│   ├── config/                  # Configuration files
│   │   ├── app.php              # App & JWT config
│   │   ├── database.php         # DB connection config
│   │   └── ...
│   ├── database/                # Database migrations & schema
│   │   └── schema.sql           # Main schema
│   ├── .env                     # Environment variables (ignored)
│   ├── .env.example             # Template for environment variables
│   ├── composer.json
│   ├── Readme.md
│   └── ...
├── scripts/
│   └── build.js                 # Production build script
├── dist/                        # Production build output (auto-generated)
├── docs/
│   └── plan.md                  # Project planning documentation
├── .prettierrc                  # Prettier configuration
├── .prettierignore
├── package.json
└── Readme.md
```

## Building and Running

### Prerequisites

- Node.js 20+ (required for Prettier and build scripts)
- npm or bun package manager
- PHP 8.0+ (for backend development)
- MySQL or MariaDB (for backend database)
- Composer (for PHP dependencies)

### Frontend Installation

```bash
# Clone the repository
git clone https://github.com/Drakaniia/Haven-Space.git
cd Haven-Space

# Install dependencies
bun install
```

### Development Commands

```bash
# Format all files
bun run format

# Check formatting (CI check)
bun run format:check

# Build for production
bun run build

# Serve locally (auto-opens browser)
bun run start

# Or serve without opening browser
bun run serve
```

### Backend Installation

```bash
cd server
composer install
cp .env.example .env
# Configure database and JWT secret in .env
php migrate
```

### Running Locally

**Frontend:**

```bash
# Using the built-in start script (opens browser)
bun run start

# Or serve without opening browser
bun run serve

# Or using any static file server
npx http-server -p 3000
python -m http.server 3000
```

Navigate to `http://localhost:3000/client/views/public/index.html` to view the application.

**Backend:**

```bash
cd server
php -S localhost:8000 -t api
```

### Deployment

The application deploys automatically to **GitHub Pages** when changes are pushed to the `main` branch via the GitHub Actions workflow.

Manual deployment trigger:

- Go to Actions → "Deploy to GitHub Pages" → Run workflow

Production URLs after deployment:

- **Homepage**: `https://havenspace.com/` (or `https://<username>.github.io/haven-space/`)
- **Map View**: `https://havenspace.com/maps.html`
- **Login**: `https://havenspace.com/auth/login.html`
- **Signup**: `https://havenspace.com/auth/signup.html`

## Development Conventions

### Code Formatting (Prettier)

Configuration (`.prettierrc`):

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

**Important**: Line endings must be LF (not CRLF) for GitHub Actions compatibility.

### Commit Message Format

Follow **Conventional Commits** specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Commit Types:**

| Type       | Description                       |
| ---------- | --------------------------------- |
| `feat`     | New feature                       |
| `fix`      | Bug fix                           |
| `docs`     | Documentation                     |
| `style`    | Formatting (Prettier, whitespace) |
| `refactor` | Code refactoring                  |
| `test`     | Tests                             |
| `chore`    | Maintenance, dependencies         |
| `ci`       | CI/CD workflows                   |
| `perf`     | Performance improvements          |
| `build`    | Build system changes              |
| `setup`    | Initial setup, scaffolding        |

**Examples:**

```bash
git commit -m "feat: add user authentication system"
git commit -m "fix(css): resolve navigation overflow on mobile"
git commit -m "docs: update README with setup instructions"
git commit -m "style: fix line endings for GitHub Actions"
```

### Branch Naming Convention

Format: `<type>/<description>`

```bash
git checkout -b feat/user-authentication
git checkout -b fix/navigation-mobile-overflow
git checkout -b docs/update-readme
git checkout -b refactor/api-error-handling
git checkout -b hotfix/critical-security-patch
```

### CSS Architecture

- **CSS Custom Properties**: Defined in `global.css` under `:root`
- **Component Styles**: Modular files in `css/components/`
- **Page Styles**: Specific styles in `css/views/`
- **Import Order**: `global.css` imports component and view styles

**Color Palette:**

```css
:root {
  --primary-green: #4a7c23;
  --dark-green: #2d4a14;
  --light-green: #7cb342;
  --bg-cream: #fef9f0;
  --bg-green: #e8f5e9;
  --text-dark: #1a1a1a;
  --text-gray: #555555;
  --white: #ffffff;
  --font-main: 'Plus Jakarta Sans', sans-serif;
  --border-color: #e5e5e5;
}
```

### JavaScript Patterns

- **ES6+ Features**: `const`/`let`, arrow functions, template literals
- **Module Pattern**: ES modules with `import`/`export`
- **DOM Ready**: Wrap initialization in `DOMContentLoaded`
- **Naming**: Descriptive variable/function names
- **Security**: Use `credentials: 'include'` for fetch calls to support secure cookies

```javascript
// Entry point pattern (main.js)
import { initLogoCloud } from './components/logo-cloud.js';
import { initSidebar } from './components/sidebar.js';
import { initNavbar } from './components/navbar.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Auth Guard Example
  const response = await fetch('/api/auth/me.php', { credentials: 'include' });
  if (response.ok) {
    const { user } = await response.json();
    // ... initialize app with user
  }

  // Component initialization
  if (document.getElementById('sidebar-container')) {
    initSidebar({
      role: user.role,
      user: user,
    });
  }
});
```

### PHP Backend Patterns

**Keep it simple:**

```php
// Use secure cookies for session tokens
setcookie('access_token', $token, [
    'expires' => time() + 3600,
    'httponly' => true,
    'samesite' => 'Lax'
]);
```

**Guidelines:**

- Write straightforward, readable code
- Use environment variables for sensitive config (`$_ENV['JWT_SECRET']`)
- Use prepared statements for security (PDO)
- Standardize error responses: `echo json_encode(['error' => 'Message'])`
- Implement rate limiting for sensitive endpoints

## Key Features

### Authentication System

- Secure JWT sessions using **httpOnly cookies** (Access & Refresh tokens)
- Automatic token refresh mechanism in `main.js`
- **Rate limiting** on login (5 attempts / 5 minutes)
- **Enhanced password policy** (8+ chars, uppercase, lowercase, number)
- Dual-role support (landlord/boarder) with role-based redirection
- Forgot password with email recovery placeholders

### Homepage

- Hero section with modern design
- Logo cloud with infinite horizontal slider
- Responsive navigation with floating header effect
- Call-to-action buttons

### Dashboard Views

**Boarder Dashboard:**

- Rooms - Browse and view room details
- Applications - Submit and track rental applications (Timeline view)
- Payments - **Traffic Light Status System** (Green/Yellow/Red)
- Maintenance - Submit and track maintenance requests
- Messages - Communication with landlords
- Notices - View announcements
- Profile - Manage user profile

**Landlord Dashboard:**

- Listings - Manage property listings (CRUD with map pinning)
- Boarders - Manage current boarders
- Applications - Review and manage rental applications
- Payments - **Payment Status Overview** with auto-reminders
- Maintenance - View and manage maintenance requests
- Messages - Communication with boarders
- Reports - Business analytics and revenue tracking
- Profile - Manage user profile

**Admin Dashboard:**

- System administration and oversight

## Code Generation Philosophy

**Keep it simple, keep it functional.** Before generating any code, always prioritize simplicity over complexity.

### Guidelines

- **Simple by default**: Write the simplest code that solves the problem. Avoid over-engineering.
- **Functional first**: Every line of code must serve a clear purpose. Remove decorative or unnecessary code.
- **No premature optimization**: Don't add abstractions, patterns, or utilities "just in case." Add them when the need arises.
- **Vanilla over libraries**: Use native JavaScript/CSS features before reaching for external dependencies.
- **Readable names**: Use clear, descriptive variable and function names. Avoid clever abbreviations.
- **Single responsibility**: Each function should do one thing well. Split complex functions into smaller ones.
- **Minimal DOM manipulation**: Cache DOM references, batch updates, and avoid redundant queries.
- **CSS efficiency**: Reuse existing CSS variables and utility classes. Don't create new styles for what existing styles can handle.

## Related Documentation

- [Contributing Guidelines](.github/CONTRIBUTING.md)
- [Pull Request Template](.github/pull_request_template.md)
- [Frontend README](client/README.md)
- [Backend README](server/Readme.md)
- [Views Documentation](client/views/README.md)
