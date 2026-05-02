# Gender Preference and Property Rules Implementation

## Summary

Added gender preference field and property rules section to the listing creation form.

## Changes Made

### 1. Frontend (HTML)

**File:** `client/views/landlord/listings/create.html`

- **Gender Preference Field**: Added a required dropdown field under "Property Type" with options:

  - Male Only
  - Female Only
  - Any Gender

- **Property Rules Section**: Added a new section below "Location" with:
  - Section title: "Property Rules"
  - Description: "Set house rules and guidelines for your property"
  - Textarea for entering house rules (optional)
  - Placeholder text with formatting guidance

### 2. Frontend (JavaScript)

**File:** `client/js/views/landlord/create-listing.js`

- Updated form data collection to include:
  - `genderPreference`: from the gender preference dropdown
  - `propertyRules`: from the property rules textarea

### 3. Backend (API)

**File:** `functions/api/landlord/create-listing.php`

- Added `genderPreference` to required fields validation
- Updated SQL INSERT statement to include:
  - `gender_preference` column
  - `property_rules` column
- Added data extraction and validation:
  - `$genderPreference`: defaults to 'any' if not provided
  - `$propertyRules`: nullable field for house rules text

### 4. Database

**Migration:** `functions/database/migrations/041_add_gender_preference_and_rules_to_properties.sql`

- Added `gender_preference` column:

  - Type: ENUM('male', 'female', 'any')
  - Default: 'any'
  - NOT NULL
  - Indexed for filtering

- Added `property_rules` column:
  - Type: TEXT
  - Nullable
  - Stores house rules as plain text

**Schema:** `functions/database/schema.sql`

- Updated properties table definition to include both new columns

## Field Details

### Gender Preference

- **Location**: Under "Property Type" in Basic Information section
- **Type**: Required dropdown
- **Options**:
  - `male` - Male Only
  - `female` - Female Only
  - `any` - Any Gender
- **Default**: 'any'
- **Purpose**: Allows landlords to specify gender restrictions for their property

### Property Rules

- **Location**: New section below "Location" in right column
- **Type**: Optional textarea
- **Purpose**: Allows landlords to specify house rules and guidelines
- **Format**: Free-form text with suggested formatting (one rule per line)
- **Examples**: No smoking, No pets, Curfew at 10 PM, etc.

## Database Migration Status

✅ Migration `041_add_gender_preference_and_rules_to_properties.sql` applied successfully

## Testing Checklist

- [ ] Gender preference dropdown displays correctly
- [ ] Gender preference is required (form validation)
- [ ] Property rules textarea displays correctly
- [ ] Property rules is optional (can be left empty)
- [ ] Form submission includes both fields
- [ ] Backend validates gender preference
- [ ] Backend stores both fields correctly
- [ ] Database columns exist and accept correct data types

## Next Steps

1. Update the edit listing form to include these fields
2. Display gender preference and property rules on property detail pages
3. Add filtering by gender preference in search/browse functionality
4. Consider adding predefined rule templates for landlords
