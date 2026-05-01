# Haven Space

## Project Snapshot

- Single-repo boarding house platform deployed on Appwrite, with a vanilla frontend in `client/` and PHP backend/runtime code in `functions/`.
- Root tooling uses Bun for package tasks and formatting; PHP dependencies live under `functions/` and `functions/api/`.
- The frontend is served from `http://localhost`; the PHP API server is expected at `http://localhost:8000` and is already running in this environment.
- The production/debug URL for browser verification is `https://haven-space.appwrite.network`.
- This root file stays lightweight. Use the nearest guide before editing inside `client/`, `functions/`, or `functions/database/`.

## Root Setup Commands

- Install JS deps: `bun install`
- Install backend deps: `composer install --working-dir functions`
- Install Appwrite function deps: `composer install --working-dir functions/api`
- Format repo: `bun run format`
- Check formatting: `bun run format:check`
- Lint frontend JS: `bun run lint`
- Build deployable frontend: `bun run build`
- Run backend tests when available: `composer test --working-dir functions`
- Run database migrations: `bun run db:setup`

## Universal Conventions

- **Database Normalization**: We are now normalizing the database by removing duplicate tables and consolidating them into unified general tables. As much as possible, eliminate redundant tables that serve the same purpose and merge them into single, well-structured tables.
- Use Bun commands for root package management and task running.
- Do not start `bun run server`; investigate logs or routing if `localhost:8000` is unhealthy.
- Keep frontend changes aligned with [DESIGN.md](/C:/Users/Qwenzy/Desktop/haven-space/DESIGN.md) and `/.agents/skills/frontend-design/SKILL.md`.
- Preserve the current split: static client assets in `client/`, request handling and business logic in `functions/`.
- Match existing naming and file placement before introducing new folders or abstractions.
- After feature work, add a small `.php` verification script only if needed for backend validation, then remove it once confirmed.
- Do not commit secrets, `.env` values, Appwrite API keys, or production-only identifiers.
- Push repo changes after finishing, because Appwrite deployment tracks the repository.
- **Icon System**: New icons should be added as SVG files in `client/assets/svg/` directory. The system now prioritizes SVG files over path data for better maintainability. icons.js is depricated remove whats referencing it.
- **Direct SVG Usage**: For simple icons, you can directly include SVG files in HTML using `<img src="../../../assets/svg/icon-name.svg">` or inline SVG, similar to the pattern used in sidebar components, icons.js is depricated remove whats referencing it. dont create new svgs, instead notify users if he needs to download that svg before proceeding

## JIT Index

### Package Structure

- Frontend app: `client/` -> [see client/AGENTS.md](/C:/Users/Qwenzy/Desktop/haven-space/client/AGENTS.md)
- Backend and API runtime: `functions/` -> [see functions/AGENTS.md](/C:/Users/Qwenzy/Desktop/haven-space/functions/AGENTS.md)
- SQL and Appwrite migrations: `functions/database/` -> [see functions/database/AGENTS.md](/C:/Users/Qwenzy/Desktop/haven-space/functions/database/AGENTS.md)

### Quick Find Commands

- Find a frontend view initializer: `rg -n "init[A-Z]" client/js/views client/js/components`
- Find a page by body view key: `rg -n "data-view" client/views`
- Find API routes: `rg -n "Router::(get|post|put|patch|delete)" functions/api/routes.php`
- Find a PHP controller/service pair: `rg -n "class .*Controller|class .*Service" functions/src`
- Find migrations or seeds: `rg --files functions/database | rg "(migrations|seeds|appwrite-migrations)"`

## Bug Fix Documentation

Whenever a recurring bug appears across prompts, and a fix has been identified and implemented, the fix should be documented in AGENTS.md. This ensures that when a similar issue arises in the future, the solution is already recorded, helping to avoid repeating the same mistake.

### Fixed: Missing Authorization Headers in API Requests (2026-04-27)

**Problem**: Several frontend JavaScript files were making API requests without including the required Authorization header with JWT token, resulting in 401 Unauthorized errors.

**Root Cause**: The authentication system uses JWT tokens stored in `localStorage` with key `token` that must be sent as `Authorization: Bearer {token}` header in all API requests to protected endpoints.

**Files Affected**:

- `client/js/views/landlord/announcements.js` - All fetch requests missing auth headers
- `client/js/views/landlord/landlord-calendar.js` - Calendar API requests
- `client/js/views/landlord/activity.js` - Activity feed requests

**Solution Pattern**: Add authentication headers to all fetch requests:

```javascript
const token = localStorage.getItem('token');
const headers = { 'Content-Type': 'application/json' };
if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}

const response = await fetch(url, {
  method: 'GET/POST/PUT/DELETE',
  headers,
  credentials: 'include',
  // ... other options
});
```

**Prevention**: When adding new API calls, always check existing files like `landlord-boarders.js` or `my-properties.js` for the correct authentication pattern.

### Removed: Redundant User Profile Columns (2026-05-01)

**Problem**: The `users` table had several redundant columns that duplicated data or stored information that should be in normalized tables: `phone` (duplicate of `phone_number`), `alt_phone` (unused), `current_address` (should be in `addresses` table via properties), `date_of_birth` (not needed), `gender` (not needed), `bio` (should be in role-specific profile tables), `employment_status` (not needed), and `avatar_url` (duplicate of `avatar_file_id` FK).

**Root Cause**: Migration `016_add_user_profile_fields.sql` added these columns without considering the existing normalized schema. The system already had `phone_number` for phone, `avatar_file_id` FK for avatars, and role-specific profile tables (`boarder_profiles`, `landlord_profiles`) for extended profile data.

**Evidence**:

- `phone` column: Redundant with existing `phone_number` column
- `alt_phone` column: Never used in code, 0 references
- `current_address` column: User addresses should be tracked via properties/applications, not stored directly in users table
- `date_of_birth` column: Not required for the application, only used in profile completion checks
- `gender` column: Not used anywhere in the application
- `bio` column: Should be in `boarder_profiles.bio` or `landlord_profiles` tables, not in base users table
- `employment_status` column: Not used anywhere in the application
- `avatar_url` column: Redundant with `avatar_file_id` FK to `files` table

**Solution**:

- Created migration `034_drop_redundant_user_columns.sql` to drop all 8 columns
- Updated code references:
  - `functions/api/users/profile.php` - Removed `date_of_birth`, `current_address` from queries and allowed update fields
  - `functions/api/landlord/boarders.php` - Removed `current_address`, `date_of_birth` from queries and response mapping
  - `functions/api/boarder/dashboard-stats.php` - Removed `current_address`, `date_of_birth`, `avatar_url` from profile completion checks

**Current Pattern**: User profile data is managed through:

- Basic contact: `users.phone_number` (single phone field)
- Avatar: `users.avatar_file_id` FK to `files` table
- Extended profile: Role-specific tables (`boarder_profiles`, `landlord_profiles`)
- Addresses: Tracked via `addresses` table linked through properties/applications

**Prevention**: Before adding columns to the `users` table, check if the data belongs in role-specific profile tables or normalized reference tables. Keep the base `users` table minimal with only authentication and core identity fields. Don't duplicate data that's already available through foreign keys.

### Fixed: applications Table Using Removed property_id Column (2026-05-01)

**Problem**: The application creation endpoint was failing with "Unknown column 'property_id' in 'field list'" error. Migration 021 had removed the `property_id` column from the `applications` table as redundant, but the schema.sql and repository code still referenced it.

**Root Cause**: Migration `021_remove_redundant_columns.sql` correctly removed `property_id` from `applications` table because it can be derived from `room_id -> rooms.property_id`. However, the schema.sql file and ApplicationRepository.php were never updated to reflect this change.

**Evidence**:

- Error: `SQLSTATE[42S22]: Column not found: 1054 Unknown column 'property_id' in 'field list'`
- Migration 021 dropped the column: `ALTER TABLE applications DROP COLUMN IF EXISTS property_id;`
- `functions/database/schema.sql` still defined `property_id INT NULL` in applications table
- `ApplicationRepository::create()` was still trying to INSERT into property_id column
- Frontend was sending property_id in request body

**Solution**:

- Updated `functions/database/schema.sql` to remove `property_id` column and FK constraint from applications table definition
- Updated `ApplicationRepository::create()` to remove property_id from INSERT statement
- Updated migration `033_convert_all_nulls_to_not_null.sql` comments to note property_id was removed
- Fixed 9 additional files that were querying `a.property_id` or `applications.property_id`:
  - `functions/src/Modules/Notification/Repositories/NotificationRepository.php` - 2 queries (getAcceptedApplications, hasAcceptedApplications)
  - `functions/api/landlord/boarders.php` - boarder listing query
  - `functions/api/payments/overview.php` - payment overview query
  - `functions/api/landlord/announcements.php` - boarder lookup for announcements
  - `functions/api/payments/history.php` - payment history query
  - `functions/api/boarder/lease.php` - lease information query
  - `functions/api/boarder/announcements.php` - landlord lookup query
  - `functions/api/admin/test_applications.php` - admin applications view
  - `functions/api/landlord/test_dashboard-stats.php` - dashboard stats query
- All queries now join through rooms table: `JOIN rooms r ON a.room_id = r.id` then `JOIN properties p ON r.property_id = p.id`
- Property ID can still be retrieved via JOIN: `SELECT r.property_id FROM applications a JOIN rooms r ON a.room_id = r.id`

**Current Pattern**: Applications table structure:

- `room_id` FK to rooms table (required)
- Property ID derived via: `room_id -> rooms.property_id`
- No redundant property_id column stored directly

**Prevention**: When migrations remove columns, immediately update schema.sql and search the codebase for all references to that column. Use `rg "property_id.*applications"` to find all code that references the removed column. Keep schema.sql synchronized with applied migrations.

**Related Issue**: The same migration 034 that removed `avatar_url` also affected `ApplicationRepository::findById()` and `functions/api/users/search.php`, which were selecting `avatar_url` directly from the users table. These were fixed to use `LEFT JOIN files f ON u.avatar_file_id = f.id` and select `f.file_url as avatar_url` instead.

## landlord credentials

qwenzy23062@gmail.com
Kenjigwapo_123

Boarder Credentials

alistairybaez574@gmail.com
Kenjigwapo_123

When making multi-file string replacements that would fail with shell regex escaping (e.g., PHP $variable['key'] patterns), write a temporary Python script to a file, run it with python <file>, verify the output, then delete the script. Use str.replace() for exact matches and raw strings (r'...') for Windows paths.
