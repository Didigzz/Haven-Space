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

## Definition of Done

- Relevant lint, format, build, or PHP checks pass for the touched area, or any gap is called out explicitly.
- Changes work for localhost and do not obviously break the Appwrite-hosted production path.
- New work follows the closest AGENTS guide and uses existing repo patterns rather than parallel ones.
- Any temporary debug or test scripts created during implementation are removed before handoff.

### Removed: Maintenance Request System (2026-05-01)

**Problem**: The maintenance request system (`maintenance_requests` table and all related functionality) was a complete feature that added complexity without being actively used or required for the core boarding house management functionality.

**Root Cause**: Feature creep. The maintenance system was built as a nice-to-have feature but wasn't essential to the platform's core value proposition of connecting landlords with boarders.

**Evidence**:

- `maintenance_requests` table existed with full CRUD operations
- Complete backend module: `MaintenanceController`, `MaintenanceService`, `MaintenanceRepository`
- Frontend views for both landlord and boarder maintenance management
- API routes for creating, viewing, updating, and deleting maintenance requests
- Notification system integration for maintenance updates
- Calendar integration showing maintenance events
- Activity feed integration showing maintenance requests

**Solution**:

- Created migration `035_drop_maintenance_system.sql` to drop the `maintenance_requests` table
- Deleted backend code:
  - `functions/src/Modules/Maintenance/Controllers/MaintenanceController.php`
  - `functions/src/Modules/Maintenance/Services/MaintenanceService.php`
  - `functions/src/Modules/Maintenance/Repositories/MaintenanceRepository.php`
- Deleted frontend code:
  - `client/js/views/boarder/boarder-maintenance.js`
  - `client/css/views/boarder/boarder-maintenance.css`
  - `client/css/views/boarder/boarder-maintenance-detail.css`
  - `client/css/views/boarder/boarder-maintenance-create.css`
  - `client/css/views/landlord/landlord-maintenance.css`
  - `client/css/views/landlord/landlord-maintenance-detail.css`
  - `client/assets/images/icons/maintenance_request.png`
- Removed API routes from `functions/api/routes.php`:
  - All `/api/landlord/maintenance/*` routes (7 routes)
  - All `/api/boarder/maintenance/*` routes (5 routes)
  - `/api/maintenance/stats` route
- Updated code references:
  - `functions/api/routes.php` - Removed MaintenanceController import and all maintenance routes
  - `functions/src/Modules/Notification/Services/NotificationService.php` - Removed `notifyMaintenanceRequest()` and `notifyMaintenanceStatusChange()` methods, removed maintenance notification type filters
  - `functions/api/landlord/calendar.php` - Removed maintenance events query and display
  - `functions/api/landlord/activity.php` - Removed maintenance activity query and formatting
  - `client/js/views/landlord/landlord-calendar.js` - Removed maintenance event navigation
  - `client/js/views/landlord/activity.js` - Removed maintenance activity type
  - `client/js/views/landlord/room-edit.js` - Removed 'maintenance' room status option
  - `client/js/views/boarder/dashboard.js` - Removed maintenance icon mapping
  - `client/js/views/boarder/announcements.js` - Removed maintenance icon mapping
  - `client/views/landlord/index.html` - Removed maintenance quick action button
  - `client/views/landlord/calendar/index.html` - Removed maintenance from subtitle and legend
  - `client/views/landlord/activity/index.html` - Removed maintenance filter option
  - `client/views/landlord/announcements/index.html` - Removed maintenance category option
  - `client/views/landlord/listings/room-edit.html` - Removed maintenance status options (2 instances)
  - `client/views/landlord/settings/index.html` - Removed maintenance notification setting
  - `client/views/boarder/index.html` - Removed maintenance from greeting text and quick action button
  - `client/views/boarder/announcements/index.html` - Removed maintenance filter tab
  - `client/views/boarder/settings/index.html` - Removed maintenance notification setting
  - `client/views/boarder/house-rules/index.html` - Removed maintenance navigation card and entire maintenance section
  - `client/views/public/for-landlords.html` - Removed maintenance benefit card
  - `client/css/views/landlord/landlord.css` - Removed maintenance CSS variables
  - `client/css/views/landlord/room-edit.css` - Removed maintenance status styling
- Updated `functions/database/migrations/033_convert_all_nulls_to_not_null.sql` to remove maintenance_requests references
- Updated `functions/database/schema.sql` to remove maintenance_requests table definition

**Current Pattern**: The platform focuses on core boarding house management features:

- Property listings and room management
- Application and booking workflow
- Payment tracking
- Messaging between landlords and boarders
- Announcements and notifications

**Prevention**: Before building new features, validate that they're essential to the core value proposition. Nice-to-have features should be deferred until the core features are solid and there's demonstrated user demand. If a feature isn't being used after initial development, remove it to reduce technical debt and maintenance burden.

## Bug Fix Documentation

Whenever a recurring bug appears across prompts, and a fix has been identified and implemented, the fix should be documented in AGENTS.md. This ensures that when a similar issue arises in the future, the solution is already recorded, helping to avoid repeating the same mistake.

### Fixed: Boarder Lease Endpoint Referencing Non-Existent average_rating Column (2026-05-01)

**Problem**: The boarder lease endpoint was failing with "SQLSTATE[42S22]: Column not found: 1054 Unknown column 'lp.average_rating' in 'field list'" error, preventing boarders from viewing their active lease information even after being accepted.

**Root Cause**: The query in `functions/api/boarder/lease.php` was trying to select `lp.average_rating` from the `landlord_profiles` table, but this column doesn't exist in the schema. The rating system was never implemented.

**Evidence**:

- Error: `SQLSTATE[42S22]: Column not found: 1054 Unknown column 'lp.average_rating' in 'field list'`
- `landlord_profiles` table schema only has: `id`, `user_id`, `boarding_house_name`, `boarding_house_description`, `property_type`, `total_rooms`, `available_rooms`, `welcome_message`, `house_rules_file_id`, `created_at`, `updated_at`
- No rating system exists in the database or codebase
- Query was LEFT JOINing `landlord_profiles` and selecting non-existent column

**Solution**:

- Updated `functions/api/boarder/lease.php` to remove `lp.average_rating as landlord_rating` from SELECT clause
- Updated response mapping to set `rating: 0` with comment "Rating system not yet implemented"
- Removed the LEFT JOIN to `landlord_profiles` since no columns from it were being used

**Current Pattern**: Landlord information in lease responses includes:

- `id`, `name`, `is_verified` from `users` table
- `rating` hardcoded to 0 until rating system is implemented

**Prevention**: Before querying columns, verify they exist in the database schema. Don't assume features like ratings exist without checking `functions/database/schema.sql`. If a feature isn't implemented, use placeholder values with clear comments rather than querying non-existent columns.

### Fixed: Google OAuth Failing Due to NULL last_name (2026-05-01)

**Problem**: Google authentication was failing with "SQLSTATE[23000]: Integrity constraint violation: 1048 Column 'last_name' cannot be null" error when users signed in with Google accounts that don't have a last name.

**Root Cause**: The Google callback code was extracting `family_name` from Google's user data and defaulting to `null` when not provided. However, the `users` table has `last_name VARCHAR(100) NOT NULL`, which rejects NULL values.

**Evidence**:

- Error: `SQLSTATE[23000]: Integrity constraint violation: 1048 Column 'last_name' cannot be null`
- Google's `family_name` field is optional and not always provided
- Code was using `$lastName = $googleUser['family_name'] ?? null;`
- Users table schema: `last_name VARCHAR(100) NOT NULL`

**Solution**:

- Updated `functions/api/auth/google/callback.php` line 186-187 to default to empty string instead of null:
  ```php
  $firstName = $googleUser['given_name'] ?? '';
  $lastName = $googleUser['family_name'] ?? '';
  ```

**Current Pattern**: When extracting optional data from OAuth providers that maps to NOT NULL database columns, always provide appropriate default values (empty string for VARCHAR, 0 for numbers, etc.) instead of null.

**Prevention**: When integrating with external APIs, check the API documentation to understand which fields are optional. For optional fields that map to NOT NULL database columns, always provide sensible defaults in the extraction logic.

### Fixed: Google Profile Picture Not Displaying (2026-05-01)

**Problem**: After logging in with Google, the user's Google profile picture wasn't displaying in the UI. Instead, users saw generated avatar initials or default avatars.

**Root Cause**: The Google callback was correctly saving the avatar URL to the database (in the `files` table), but it wasn't including the `avatar_url` in the user data passed to the frontend during the redirect. Similarly, the regular login endpoint wasn't fetching or returning the avatar URL.

**Evidence**:

- Google avatar URLs were being inserted into `files` table correctly
- `functions/api/auth/google/callback.php` created `$userData` array without `avatar_url` field
- `functions/api/auth/login.php` query didn't LEFT JOIN the `files` table
- Frontend `profile-utils.js` was looking for `user.avatar_url` but it was undefined
- `/api/auth/me` and `/api/users/profile` endpoints correctly returned `avatar_url`, but initial login data didn't

**Solution**:

- Updated `functions/api/auth/google/callback.php` to fetch avatar URL from database and include it in `$userData`:

  ```php
  // Fetch avatar URL from database
  $avatarStmt = $pdo->prepare('
      SELECT f.file_url as avatar_url
      FROM users u
      LEFT JOIN files f ON u.avatar_file_id = f.id
      WHERE u.id = ?
  ');
  $avatarStmt->execute([$userId]);
  $avatarRow = $avatarStmt->fetch();
  $userAvatarUrl = $avatarRow ? $avatarRow['avatar_url'] : null;

  $userData = [
      // ... other fields
      'avatar_url' => $userAvatarUrl,
  ];
  ```

- Updated `functions/api/auth/login.php` to:
  - Add LEFT JOIN to files table in the user query
  - Include `avatar_url` in the `$userResponse` array

**Current Pattern**: All authentication endpoints (login, Google callback, /api/auth/me) should return `avatar_url` by LEFT JOINing the `files` table on `u.avatar_file_id = f.id` and selecting `f.file_url as avatar_url`.

**Prevention**: When adding new authentication methods or modifying auth endpoints, ensure the user data returned includes all fields that the frontend expects, especially `avatar_url`. Test the complete login flow to verify profile pictures display correctly.

### Fixed: Google OAuth Referencing Removed Verification Tables (2026-05-01)

**Problem**: Google OAuth callback was failing with "SQLSTATE[42S22]: Column not found: 1054 Unknown column 'vs.status_name' in 'order clause'" error.

**Root Cause**: The Google callback had a query that was still referencing the removed `verification_records` (vr) and `verification_statuses` (vs) tables that were dropped in migration 030. The query was trying to ORDER BY and fetch verification_status from these non-existent tables.

**Evidence**:

- Error: `Unknown column 'vs.status_name' in 'order clause'`
- Query had `ORDER BY CASE vs.status_name` and references to `vr.reviewed_at`, `vr.submitted_at`
- Migration 030 dropped `verification_records`, `verification_log`, and `verification_statuses` tables
- System now uses simple `users.is_verified` boolean flag instead

**Solution**:

- Updated `functions/api/auth/google/callback.php` to remove verification table JOINs and ORDER BY clause
- Simplified query to just fetch `u.is_verified` and `acs.status_name` from users and account_statuses tables
- Derive `verification_status` from `is_verified` flag for landlords: `$verificationStatus = $isVerified ? 'approved' : 'pending';`

**Current Pattern**: Verification status is derived from `users.is_verified` boolean:

- For landlords: `verification_status = is_verified ? 'approved' : 'pending'`
- For boarders: No verification status needed
- No complex verification tables or audit trails

**Prevention**: After removing database tables via migration, search the entire codebase for references to those table names (including aliases like `vr`, `vs`, `vl`). Use `rg "verification_records|verification_statuses|verification_log"` to find all references.

### Fixed: Duplicate Applications Allowed (2026-05-01)

**Problem**: Boarders could accidentally submit multiple applications to the same room by clicking the apply button multiple times or navigating back and resubmitting. This created duplicate records in the database and confused landlords viewing applications.

**Root Cause**: The `applications` table had no unique constraint to prevent duplicate applications from the same boarder to the same room. The application creation logic also didn't check for existing applications before inserting.

**Evidence**:

- Multiple application records with same `boarder_id` and `room_id` in database
- Landlord boarders page showed duplicate entries for the same boarder
- No validation in `ApplicationRepository::create()` to check for existing applications
- No database constraint to enforce uniqueness

**Solution**:

- Created migration `037_prevent_duplicate_applications.sql` to:
  - Remove existing duplicate applications (keeping the oldest one)
  - Add unique constraint `UNIQUE KEY unique_boarder_room_application (boarder_id, room_id)`
- Updated `ApplicationRepository::create()` to:
  - Check for existing applications (including soft-deleted ones) before inserting
  - Throw `InvalidArgumentException` with user-friendly message if active application exists
  - Hard-delete soft-deleted applications to allow re-application after deletion
- Updated `client/js/views/boarder/confirm-booking.js` to:
  - Catch duplicate application errors and show user-friendly message
  - Redirect to applications dashboard after 2 seconds when duplicate detected
- Updated `functions/database/schema.sql` to include the unique constraint

**Current Pattern**: Application uniqueness is enforced at two levels:

- **Database Level**: Unique constraint on `(boarder_id, room_id)` prevents duplicates even if validation is bypassed
- **Application Level**: Repository checks for existing applications and provides user-friendly error messages
- **Soft Delete Handling**: Soft-deleted applications are hard-deleted automatically when boarder re-applies to same room

**Prevention**: When creating tables that should have unique combinations of columns, add unique constraints from the start. Always validate uniqueness in the repository layer before database insertion to provide better error messages. Test duplicate scenarios during development.

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

### Fixed: update-listing.php Using Non-Existent address Column (2026-05-01)

**Problem**: The `update-listing.php` endpoint was trying to update non-existent columns (`address`, `latitude`, `longitude`) directly in the `properties` table, causing SQL error "Unknown column 'address' in 'field list'".

**Root Cause**: Schema mismatch. The `properties` table uses `address_id` as a foreign key to the normalized `addresses` table, but the update endpoint was trying to update address fields directly in the properties table instead of updating the related addresses record.

**Evidence**:

- Error: `SQLSTATE[42S22]: Column not found: 1054 Unknown column 'address' in 'field list'`
- `properties` table has `address_id` FK, not `address`, `latitude`, `longitude` columns
- `addresses` table contains: `address_line_1`, `city`, `province`, `latitude`, `longitude`
- `create-listing.php` correctly inserts into `addresses` first, then uses `address_id` in `properties`
- `update-listing.php` was trying to update address fields directly in `properties` table

**Solution**:

- Updated `functions/api/landlord/update-listing.php` to:
  - Fetch `address_id` from the property record
  - Update the `addresses` table separately with address-related fields
  - Update only property-specific fields (`title`, `description`, `price`, `status`) in `properties` table
  - Preserve existing values when fields are not provided in the update request

**Current Pattern**: Property updates follow the normalized schema:

- Address changes: UPDATE `addresses` table using the `address_id` from the property
- Property changes: UPDATE `properties` table with property-specific fields only
- Both operations wrapped in a transaction for consistency

**Prevention**: When writing update endpoints, always check the actual database schema to ensure column names match. Follow the pattern used in create endpoints for consistency. Use normalized tables correctly - update the related table via foreign key, don't try to update FK fields directly in the parent table.

### Removed: Redundant document_types and documents Tables (2026-04-30)

**Problem**: The `document_types` and `documents` tables existed in the schema but were never used by the application. The actual verification system uses a different approach with string-based document types.

**Root Cause**: Schema was designed with a normalized approach (lookup table + foreign keys), but the implementation used a simpler string-based approach where document types are stored directly as VARCHAR values in verification records.

**Evidence**:

- `documents` table: 0 records, never referenced in code
- `document_types` table: 9 seed records, never queried
- `landlord_verification_documents` table referenced in code doesn't exist in database
- Frontend hardcodes document types in `client/js/views/landlord/verification.js`
- Backend validation uses string literals like 'government_id_front', 'government_id_back', 'selfie_with_id'

**Solution**: Removed both tables via migration `024_drop_unused_document_tables.sql` and updated `schema.sql` to reflect the actual implementation pattern.

**Current Pattern**: Document types are managed as:

- Frontend: Hardcoded in `DOCUMENT_TYPES` constant in verification.js
- Backend: String validation in API endpoints (e.g., `upload-verification-document.php`)
- Storage: VARCHAR fields in verification-related tables

**Prevention**: When adding new tables to schema.sql, ensure they're actually used by the implementation. If a table exists in schema but has no corresponding code usage, it should be removed or the implementation should be updated to use it.

### Consolidated: Property Tables into Single Normalized Structure (2026-04-30)

**Problem**: Six property-related tables (`properties`, `property_details`, `property_locations`, `property_photos`, `property_reports`, `property_types`) created redundancy and confusion. `property_details` duplicated fields already in `properties` table, and `property_locations` was incorrectly linked to `landlord_id` instead of `property_id`.

**Root Cause**: Incremental development without proper schema review led to duplicate columns across tables:

- `property_details` duplicated: `deposit`, `min_stay`, `house_rules` (already in `properties`)
- `property_details` duplicated: `city`, `province` (already in `addresses` table via `address_id` FK)
- `property_locations` was linked to landlord instead of individual properties, making it impossible to have multiple properties at different locations

**Evidence**:

- All 6 tables existed but `property_details` and `property_locations` had 0 records
- `properties` table already has proper normalization via `address_id` FK to `addresses` table
- Migration `022_merge_property_tables.sql` was created but never executed

**Solution**:

- Executed migration `022_merge_property_tables.sql` to drop `property_details` and `property_locations` tables
- Updated all code references to use `properties` and `addresses` tables directly:
  - `functions/src/AI/PropertyService.php` - Updated query to use `addresses.city/province` instead of `property_details`
  - `functions/api/landlord/property-location.php` - Rewritten to use `addresses` table
  - `functions/api/landlord/properties.php` - Removed `property_locations` JOIN
  - `functions/api/admin/landlords.php` - Updated to query `addresses` via `properties`
  - `scripts/clear_user.php` - Removed `property_locations` deletion
  - `scripts/reset-database.php` - Removed `property_locations` from table list
  - `functions/database/seeds/sample-properties.php` - Removed `property_details` seed code

**Current Structure**:

- **Keep**: `properties` (main table with `address_id` FK to `addresses`)
- **Keep**: `property_photos` (1-to-many, stores multiple photos per property)
- **Keep**: `property_reports` (1-to-many, stores user reports about properties)
- **Deleted**: `property_types` (lookup table removed, now using VARCHAR in landlord_profiles)
- **Deleted**: `property_details` (completely redundant)
- **Deleted**: `property_locations` (wrong FK design, redundant with `addresses`)

**Prevention**: Before creating new tables, check if existing normalized tables (like `addresses`) already provide the needed structure. Avoid duplicating columns across tables. Always link child tables to the correct parent entity (properties, not landlords).

### Removed: property_types Lookup Table (2026-04-30)

**Problem**: The `property_types` lookup table added unnecessary complexity for a simple field that rarely changes and has a limited set of values.

**Root Cause**: Over-normalization. Property types ('Single unit', 'Multi-unit', 'Apartment', 'Dormitory') are stable values that don't require a separate lookup table with foreign key constraints.

**Evidence**:

- Only 4 property types existed and were hardcoded in seed data
- No dynamic property type management in the application
- Foreign key constraint added complexity to landlord registration
- No benefit from normalization since property types are not frequently updated

**Solution**:

- Created migration `025_convert_property_type_to_varchar.sql` to convert `property_type_id` FK to `property_type` VARCHAR(100)
- Updated all code references:
  - `functions/api/auth/register.php` - Changed to use VARCHAR 'Single unit' default
  - `functions/api/auth/google/callback.php` - Changed to use VARCHAR 'Single unit' default
  - `functions/api/landlord/properties.php` - Updated JOIN to use `lp.property_type` directly
  - `functions/api/admin/test_landlords.php` - Updated JOIN to use `lp.property_type` directly
  - `analyze_dependencies.php` - Removed from table list
- Updated `functions/database/schema.sql` to reflect VARCHAR approach

**Current Pattern**: Property types are managed as:

- Storage: VARCHAR(100) NOT NULL in `landlord_profiles.property_type`
- Common values: 'Single unit', 'Multi-unit', 'Apartment', 'Dormitory'
- Default: 'Single unit' for new landlord registrations

**Prevention**: Use lookup tables only when the data is truly dynamic and managed through the application. For stable, limited value sets, VARCHAR is simpler and more maintainable.

### Removed: payment_method_types Lookup Table (2026-05-01)

**Problem**: The `payment_method_types` lookup table added unnecessary complexity for a simple field with a stable set of values. The code was already using VARCHAR strings directly, creating a complete mismatch with the database schema.

**Root Cause**: Over-normalization combined with implementation mismatch. The `payment_methods` table had `payment_method_type_id` FK column, but the API code (`functions/api/landlord/payment-methods.php`) was inserting/querying `method_type` VARCHAR values directly.

**Evidence**:

- `payment_method_types` table: 6 seed records, never queried by code
- `payment_methods` table: 0 records, schema had FK column but code used VARCHAR
- API validation hardcoded: `['GCash', 'PayMaya', 'Bank Transfer', 'PayPal', 'GrabPay', 'Other']`
- Complete schema/code mismatch prevented any payment methods from being saved
- Payment method types are stable values that don't require dynamic management

**Solution**:

- Created migration `032_convert_payment_method_type_to_varchar.sql` to:
  - Drop FK constraint `payment_methods_ibfk_2`
  - Drop `payment_method_type_id` column
  - Add `method_type VARCHAR(100) NOT NULL` column
  - Drop `payment_method_types` lookup table
- Updated `functions/database/schema.sql` to reflect VARCHAR approach

**Current Pattern**: Payment method types are managed as:

- Storage: VARCHAR(100) NOT NULL in `payment_methods.method_type`
- Common values: 'GCash', 'PayMaya', 'Bank Transfer', 'PayPal', 'GrabPay', 'Other'
- Validation: Hardcoded array in API endpoint for consistency

**Prevention**: Before creating lookup tables, verify the implementation actually uses FK relationships. If the code hardcodes values as strings, use VARCHAR directly. Don't create schema/code mismatches that prevent features from working.

### Removed: Verification System Tables (2026-05-01)

**Problem**: The `verification_records`, `verification_log`, and `verification_statuses` tables were designed for a complex verification workflow but were never used in production (0 records in all tables).

**Root Cause**: Over-engineered solution. The system only needed a simple boolean flag (`users.is_verified`) to track landlord verification status, not a multi-table entity-agnostic verification system with audit trails.

**Evidence**:

- `verification_records`: 0 records, never used
- `verification_log`: 0 records, never used
- `verification_statuses`: 3 lookup values (pending, approved, rejected), never referenced
- All verification queries used complex LEFT JOINs that returned NULL for every user
- Middleware and auth endpoints had to fall back to `users.is_verified` anyway

**Solution**:

- Created migration `030_drop_verification_system.sql` to drop all three tables
- Updated 8 PHP files to remove verification LEFT JOINs:
  - `functions/api/middleware.php` - Removed verification JOINs, use `u.is_verified`
  - `functions/api/auth/me.php` - Simplified verification status derivation
  - `functions/api/auth/register.php` - Removed verification_records INSERT
  - `functions/api/auth/google/callback.php` - Removed verification_records INSERT
  - `functions/api/admin/landlords.php` - Removed verification_log queries, simplified approve/reject
  - `functions/api/admin/test_landlords.php` - Removed verification JOINs
- Updated `functions/database/schema.sql` to remove table definitions

**Current Pattern**: Landlord verification is managed through:

- `users.is_verified` BOOLEAN - Simple flag set by admin approval
- `users.account_status_id` FK to `account_statuses` - Controls login access (active/suspended/banned/pending_verification)
- Admin approval: `UPDATE users SET is_verified = 1, account_status_id = 1 WHERE id = ?`

**Why account_statuses was kept**: Unlike the verification tables, `account_statuses` is actively used and has behavioral logic (`is_active` flag) that middleware depends on to block suspended/banned users. It follows the same pattern as `user_roles` for consistency.

**Prevention**: Don't build complex multi-table systems for simple boolean state. If a feature requires more than 2 tables and has 0 records after initial development, it's probably over-engineered. Start simple, add complexity only when actually needed.

### Removed: schema_migrations Tracking Table (2026-04-30)

**Problem**: The `schema_migrations` table was used to track applied database migrations, but the project doesn't use an automated migration system consistently.

**Root Cause**: The migration tracking system was partially implemented but not integrated into the deployment workflow. Migrations were being applied manually, making the tracking table redundant.

**Evidence**:

- `schema_migrations` table had 23 records but wasn't actively used
- `functions/database/migrate.php` script existed but wasn't part of the deployment process
- Migrations in `functions/database/migrations/` directory were applied manually
- No references to the migration runner in deployment scripts or documentation

**Solution**:

- Created migration `026_drop_schema_migrations_table.sql` to drop the table
- Deleted `functions/database/migrate.php` migration runner script
- Migrations are now applied manually as needed

**Current Pattern**: Database changes are managed through:

- Manual execution of SQL migration files in `functions/database/migrations/`
- Direct updates to `functions/database/schema.sql` for new installations
- No automated migration tracking

**Prevention**: If migration tracking is needed in the future, implement it as part of the deployment pipeline with proper integration, or use a well-established migration tool like Phinx or Laravel Migrations.

### Removed: Onboarding Document System (2026-04-30)

**Problem**: The entire onboarding document system (`boarder_document_acknowledgments`, `landlord_documents`, `welcome_message_logs`) was designed but never implemented or used in production.

**Root Cause**: Feature was partially developed but never completed. Missing critical infrastructure tables (`auto_send_documents`, `welcome_message_templates`) that the code referenced, making the feature non-functional.

**Evidence**:

- `boarder_document_acknowledgments`: 0 records, never used
- `landlord_documents`: 0 records, never used
- `welcome_message_logs`: 0 records, never used
- Code referenced non-existent tables: `auto_send_documents`, `welcome_message_templates`
- No landlord had ever uploaded documents or configured welcome messages
- No boarder had ever received or acknowledged documents

**Solution**:

- Created migration `028_drop_onboarding_document_system.sql` to drop all three tables
- Deleted backend code:
  - `functions/src/Modules/Onboarding/Controllers/OnboardingController.php`
  - `functions/src/Modules/Onboarding/Services/OnboardingService.php`
  - `functions/src/Modules/Onboarding/Repositories/OnboardingRepository.php`
- Deleted frontend code:
  - `client/js/views/boarder/documents.js`
  - Removed document vault functions from `client/js/views/boarder/dashboard.js`
  - Removed acknowledgment button from `client/js/views/boarder/house-rules.js`
- Removed API routes from `functions/api/routes.php`:
  - `/api/landlord/welcome-message` (GET, POST)
  - `/api/landlord/documents` (GET, POST, DELETE)
  - `/api/landlord/documents/auto-send` (GET, POST)
  - `/api/boarder/documents` (GET)
  - `/api/boarder/documents/acknowledge` (POST)
  - `/api/onboarding/welcome` (POST)
- Updated `functions/database/schema.sql` to remove table definitions

**Current Pattern**: Document management is handled through:

- House rules: Stored in `landlord_profiles.house_rules_file_id` (links to `files` table)
- Property documents: Not currently implemented (feature removed)
- Boarder onboarding: Handled through application acceptance flow, not separate document system

**Prevention**: Before building complex multi-table features, ensure all infrastructure tables are created and the feature is fully integrated. Don't leave partially implemented features in the codebase. If a feature isn't being used after initial development, remove it rather than letting it accumulate technical debt.

- No automated migration tracking

**Prevention**: If migration tracking is needed in the future, implement it as part of the deployment pipeline with proper integration, or use a well-established migration tool like Phinx or Laravel Migrations.

### Removed: Redundant Landlord Verification Tables (2026-04-30)

**Problem**: The `landlord_verification_data` and `landlord_verification_log` tables duplicated functionality already provided by the normalized `verification_records` and `verification_log` tables.

**Root Cause**: Two parallel verification systems existed - a landlord-specific legacy system and a newer normalized entity-agnostic system. The code was writing to both systems simultaneously, creating data redundancy.

**Evidence**:

- `landlord_verification_data`: Stored registration form data (phone, experience_level, id_type, id_number) that was either redundant (phone already in `users.phone_number`) or should be in uploaded documents (ID info). Had 0 records and was never queried.
- `landlord_verification_log`: Stored admin verification actions (landlord_user_id, admin_user_id, action, comment) that duplicated `verification_log` functionality. Had 0 records.
- `functions/api/admin/landlords.php` was writing to both `verification_records` AND `landlord_verification_log` for every admin action
- The normalized system (`verification_records` + `verification_log`) was already fully integrated in middleware, auth endpoints, and admin endpoints

**Solution**:

- Created migration `027_drop_redundant_verification_tables.sql` to drop both tables
- Updated `functions/api/admin/landlords.php` to use only `verification_log` (linked via `verification_record_id`)
- Updated `functions/api/auth/register.php` to remove `landlord_verification_data` insert
- Updated `functions/api/auth/google/callback.php` to remove `landlord_verification_data` insert
- Updated `scripts/clear_user.php` to remove `landlord_verification_data` deletion
- Updated `scripts/reset-database.php` to remove `landlord_verification_log` from truncate list
- Updated `functions/database/schema.sql` to remove table definition

**Current Pattern**: Verification is managed through:

- `verification_records` table: Tracks verification status for any entity (user, landlord_profile, property, document)
- `verification_log` table: Audit trail of admin actions linked to verification records
- Phone number: Stored in `users.phone_number`
- ID verification: Done through document uploads, not stored as text fields

**Prevention**: Use the normalized `verification_records` and `verification_log` tables for all verification tracking. Avoid creating entity-specific verification tables. Store sensitive verification data (like ID numbers) in secure document storage, not as database text fields.

### Removed: Redundant property_id Column from announcements Table (2026-04-30)

**Problem**: The `announcements.property_id` column was redundant with the `announcement_properties` junction table. The system had two parallel ways to track which properties an announcement targets.

**Root Cause**: Over-design with both a single-property FK column and a many-to-many junction table. The code always set `property_id` to NULL and used only the junction table for property targeting.

**Evidence**:

- `announcements.property_id`: Always set to NULL in code, never used for its intended purpose
- `announcement_properties`: Junction table actively used for all property targeting scenarios
- Code pattern: NULL property_id + no junction records = "all properties", junction records = specific properties
- The single-column approach couldn't handle multiple property targeting, making it inherently limited

**Solution**:

- Created migration `029_remove_redundant_property_id_from_announcements.sql` to drop the column, its FK constraint, and index
- Updated `functions/api/landlord/announcements.php`:
  - Removed `property_id` from INSERT statement
  - Removed JOIN with properties table in SELECT
  - Updated logic to determine target_property display from junction table only
- Updated `functions/api/boarder/announcements.php`:
  - Simplified query to use only `announcement_properties` LEFT JOIN
  - Removed redundant property_id checks from WHERE clause
  - Removed `target_property` from response (not needed on boarder side)
- Updated `functions/database/migrations/010_create_announcements_table.sql` to reflect new structure
- Updated `functions/database/schema.sql` (when it gets the announcements tables added)

**Current Pattern**: Announcement property targeting is managed through:

- **All properties**: No records in `announcement_properties` junction table
- **Single property**: One record in `announcement_properties`
- **Multiple properties**: Multiple records in `announcement_properties`
- Display logic: "All Properties" if no junction records, property name if one record, "X Properties" if multiple

**Prevention**: Don't create both a single FK column and a junction table for the same relationship. If you need many-to-many capability, use only the junction table - it can handle all scenarios (zero, one, or many). A NULL FK column + junction table pattern creates confusion and redundancy.

### Converted: All NULL Columns to NOT NULL (2026-05-01)

**Problem**: Nullable columns throughout the database created ambiguity between "no value provided" and "intentionally empty", making data validation inconsistent and queries more complex.

**Root Cause**: Initial schema design allowed NULL for many optional fields without considering whether empty string or zero would be more appropriate defaults.

**Solution**:

- Created migration `033_convert_all_nulls_to_not_null.sql` to:
  - Update all existing NULL values to appropriate defaults (empty string, 0, default date, empty JSON)
  - Alter column definitions to NOT NULL with DEFAULT values
  - Preserve nullable columns only where semantically correct (optional FKs, timestamps that represent "not yet occurred")

**Columns Converted** (40+ columns across 20+ tables):

- Text fields: `description`, `message`, `bio`, `notes`, etc. → NOT NULL DEFAULT '' or NOT NULL (for TEXT)
- Numeric fields: `budget_min`, `budget_max`, `latitude`, `longitude`, `size` → NOT NULL DEFAULT 0
- Date/DateTime fields: `move_in_date`, `email_verification_expires`, `last_read_at` → NOT NULL DEFAULT '1970-01-01' or '1970-01-01 00:00:00'
- JSON fields: `house_rules`, `metadata` → NOT NULL (empty JSON array/object)
- VARCHAR fields: `phone_number`, `google_id`, `postal_code`, `bank_name`, etc. → NOT NULL DEFAULT ''

**Columns That Remain Nullable** (semantically correct):

- Optional Foreign Keys: `avatar_file_id`, `house_rules_file_id`, `related_user_id`, `related_property_id`, `property_id`, `room_id`, `boarder_id`
- UNIQUE Constraint Fields: `google_id` (NULL for non-Google users to avoid duplicate empty strings)
- Event Timestamps: `paid_date`, `reminder_sent_at`, `completed_at`, `read_at`, `last_read_at`, `used_at`
- Soft Delete: All `deleted_at` columns

**Current Pattern**:

- Use NOT NULL with appropriate defaults for all required data fields
- Use NULL only for optional foreign keys and timestamps representing "not yet occurred" events
- Empty string ('') for missing text, 0 for missing numbers, empty JSON for missing structured data

**Prevention**: When creating new columns, default to NOT NULL with appropriate defaults. Only use NULL for optional foreign keys or timestamps that represent future/conditional events. This makes data validation simpler and queries more predictable.

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

When making multi-file string replacements that would fail with shell regex escaping (e.g., PHP $variable['key'] patterns), write a temporary Python script to a file, run it

with python <file>, verify the output, then delete the script. Use str.replace() for exact matches and raw strings (r'...') for Windows paths.
