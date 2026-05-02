# Haven Space — Bug Fix Documentation

This file records recurring bugs, their root causes, and proven fixes. **Read this before implementing changes** to avoid repeating known mistakes. New entries go here, not in AGENTS.md.

---

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

### Removed: payment_method_types Lookup Table (2026-05-01)

**Problem**: The `payment_method_types` lookup table added unnecessary complexity for a simple field with a stable set of values. The code was already using VARCHAR strings directly, creating a complete mismatch with the database schema.

**Root Cause**: Over-normalization combined with implementation mismatch. The `payment_methods_landlord` table had `payment_method_type_id` FK column, but the API code (`functions/api/landlord/payment-methods.php`) was inserting/querying `method_type` VARCHAR values directly.

**Evidence**:

- `payment_method_types` table: 6 seed records, never queried by code
- `payment_methods_landlord` table: 0 records, schema had FK column but code used VARCHAR
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

- Storage: VARCHAR(100) NOT NULL in `payment_methods_landlord.method_type`
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

**Prevention**: When creating new columns, default to NOT NULL with appropriate defaults. Only use NULL for optional foreign keys or timestamps that represent "not yet occurred" events. This makes data validation simpler and queries more predictable.

### Fixed: update-listing.php Missing Fields (2026-05-01)

**Problem**: The `update-listing.php` endpoint only updated a subset of property fields (title, description, price, status, address), but ignored other fields that users can edit in the form: deposit, min_stay, room capacity, and contact information.

**Root Cause**: The endpoint was initially created with minimal field support and never expanded to handle all editable fields. Additionally, the schema.sql file was outdated and didn't reflect the actual database structure.

**Evidence**:

- Frontend sent: `deposit`, `total_rooms`, `capacity`, `min_stay`, contact fields (person, number, email, hours)
- Backend only updated: `title`, `description`, `price`, `status` in properties table, and address fields in addresses table
- `deposit` and `min_stay` columns exist in properties table but weren't being updated
- Contact information fields don't exist in any table - they're UI-only
- Room capacity/count: The actual database had `room_number`, `room_type`, `capacity` columns but schema.sql was outdated

**Solution Applied**:

1. Updated `update-listing.php` to include `deposit` and `min_stay` in the UPDATE query with proper format mapping
2. Added room update logic to handle:
   - Adding new rooms when `total_rooms` increases
   - Soft-deleting excess rooms when `total_rooms` decreases
   - Updating capacity and room_type for all existing rooms when capacity changes
3. Updated `create-listing.php` to include `description` field in room INSERT statements
4. Updated `schema.sql` to reflect actual database structure with `room_number`, `room_type`, `capacity` columns
5. Removed Contact Information section from edit property form (should be in landlord settings instead)

**Current Pattern**: Property updates now handle:

- Basic info: `title`, `description`, `price`, `status`
- Financial: `deposit`, `min_stay`
- Location: All address fields via `addresses` table
- Rooms: Dynamic room count and capacity updates with soft delete for removed rooms
- Photos and amenities: Already working

**Prevention**:

- Keep schema.sql in sync with actual database structure
- Verify all form fields have corresponding backend handling
- Keep create and update endpoints in sync - if create accepts a field, update should too
- Document which fields are UI-only vs database-backed
- Fix schema mismatches before building features that depend on those columns
