# Database

## Package Identity

- `functions/database/` holds SQL schema migrations and seed data.
- This folder is the source of truth for relational schema changes.

## Setup & Run

- Local database helpers are driven from root scripts such as `bun run db:setup`, `bun run db:reset`, and `bun run db:reset:force`.

## Patterns & Conventions

- Add new SQL migrations as ordered, forward-only files in `functions/database/migrations/`.
- Keep migration names descriptive and sequential, following examples like [functions/database/migrations/018_create_oauth_pending_registrations_table.sql](/C:/Users/Qwenzy/Desktop/haven-space/functions/database/migrations/018_create_oauth_pending_registrations_table.sql).
- DO: inspect related earlier schema files before adding columns or tables, starting with [functions/database/migrations/001_create_users_table.sql](/C:/Users/Qwenzy/Desktop/haven-space/functions/database/migrations/001_create_users_table.sql).
- DO: keep seed assumptions compatible with the latest schema.
- DON'T: edit old numbered migrations in place once they have been used; create a new migration instead.
- DON'T: put ad hoc schema changes into feature PHP files or controller code.

## Key Files

- SQL migrations: [functions/database/migrations](/C:/Users/Qwenzy/Desktop/haven-space/functions/database/migrations)
- Seeds: [functions/database/seeds](/C:/Users/Qwenzy/Desktop/haven-space/functions/database/seeds)

## JIT Index Hints

- List SQL migrations: `rg --files functions/database/migrations`
- Find all schema mentions of a table/column: `rg -n "users|properties|oauth_pending_registrations" functions/database`
- Find root scripts that invoke database flows: `rg -n "\"db:" package.json`

## Common Gotchas

- Migration ordering matters because filenames are numeric and the scripts expect that sequence.
- Reset scripts are destructive; use them only when the task actually needs a full reset.
