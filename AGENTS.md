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

## landlord credentials

qwenzy23062@gmail.com
Kenjigwapo_123

Boarder Credentials

alistairybaez574@gmail.com
Kenjigwapo_123

When making multi-file string replacements that would fail with shell regex escaping (e.g., PHP $variable['key'] patterns), write a temporary Python script to a file, run it

with python <file>, verify the output, then delete the script. Use str.replace() for exact matches and raw strings (r'...') for Windows paths.
