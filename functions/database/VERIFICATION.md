# Verification & Account Status Table Design

This document explains why the verification system uses three tables
(`verification_statuses`, `verification_records`, `verification_log`) and why
`account_statuses` exists as a separate lookup table instead of a plain VARCHAR
column on `users`.

---

## The Four Tables

```
account_statuses          verification_statuses
      │                           │
      │                           │
   users ──────────── verification_records
                               │
                               └── verification_log
```

---

## `account_statuses` — Why Not Just a VARCHAR?

### What it stores

The current state of a user's account on the platform.

```
id | status_name          | description                          | is_active
-- | -------------------- | ------------------------------------ | ---------
1  | active               | Account is active and functional     | TRUE
2  | suspended            | Account temporarily suspended        | FALSE
3  | banned               | Account permanently banned           | FALSE
4  | pending_verification | Account awaiting verification        | FALSE
```

### Why it's a separate table and not `users.account_status VARCHAR`

**1. `is_active` flag lives here.**
The middleware checks `acs.is_active` to block suspended/banned users from
authenticating. If status were a plain VARCHAR on `users`, you'd need a
`CASE` statement or application-level logic every time you check access.
With the lookup table, it's a single JOIN condition:

```sql
-- middleware.php — blocks login for non-active accounts
JOIN account_statuses acs ON u.account_status_id = acs.id
-- acs.is_active = FALSE → request rejected
```

**2. Foreign key constraint enforces valid values.**
A VARCHAR column accepts any string. The FK to `account_statuses` guarantees
only defined statuses can ever be stored — no typos like `'actve'` or
`'PENDING'` can slip in.

**3. Admin can update status in one place.**
When approving a landlord, the code does:

```sql
-- admin/landlords.php
SET u.account_status_id = (SELECT id FROM account_statuses WHERE status_name = 'active')
```

If the status label ever needs to change, only the lookup row changes —
not every row in `users`.

**4. Same pattern as `user_roles`.**
`role_id` follows the same design. Both `role_id` and `account_status_id` are
FK-backed lookup IDs. Consistency makes the schema predictable.

### Could it be a VARCHAR?

Technically yes, but you'd lose `is_active`, FK integrity, and the ability to
add metadata (description, display labels) per status without touching `users`.
The `property_type` field on `landlord_profiles` was converted to VARCHAR
precisely because it had no metadata and no behavior attached to its values.
`account_statuses` has behavior (`is_active`) — so it stays as a lookup table.

---

## `verification_statuses` — Lookup Table

### What it stores

The three possible outcomes of a verification review.

```
id | status_name | description
-- | ----------- | ----------------------------
1  | pending     | Verification pending review
2  | approved    | Verification approved
3  | rejected    | Verification rejected
```

### Why it's a separate table

Same reasoning as `account_statuses` — it's a FK target that enforces valid
values on `verification_records.verification_status_id`. The code always
resolves the ID by name:

```sql
-- register.php / landlords.php
SELECT id FROM verification_statuses WHERE status_name = 'pending'
SELECT id FROM verification_statuses WHERE status_name = 'approved'
SELECT id FROM verification_statuses WHERE status_name = 'rejected'
```

This means the status labels are defined once in the database, not scattered
as magic strings across PHP files.

---

## `verification_records` — Current State

### What it stores

One row per entity being verified. Tracks the **current** verification status,
who reviewed it, and when.

```
id | entity_type    | entity_id | verification_status_id | reviewed_by | reviewed_at
-- | -------------- | --------- | ---------------------- | ----------- | -----------
1  | user           | 42        | 1 (pending)            | NULL        | NULL
2  | user           | 55        | 2 (approved)           | 3 (admin)   | 2026-04-30
```

### Why it's separate from `users`

**1. Entity-agnostic design.**
`entity_type` can be `'user'`, `'landlord_profile'`, `'property'`, or
`'document'`. One table handles verification for all entity types. If you
merged this into `users`, you'd need separate verification columns on every
entity table.

**2. One-to-one with users, but not always present.**
Boarders never have a verification record. Only landlords get one on
registration. A nullable `verification_status_id` column on `users` would
be meaningless for boarders and admins.

**3. Separation of concerns.**
`users` stores identity. `verification_records` stores review state.
Mixing them couples two different concerns into one table.

### Relationship to `users`

```sql
-- middleware.php / me.php / login.php — all use this pattern
LEFT JOIN verification_records vr ON vr.entity_type = 'user' AND vr.entity_id = u.id
LEFT JOIN verification_statuses vs ON vr.verification_status_id = vs.id
```

`LEFT JOIN` because boarders have no record — the join returns NULL and the
code falls back to `u.is_verified`.

---

## `verification_log` — Audit Trail

### What it stores

Every admin action taken on a verification record. One row per action —
never updated, only appended.

```
id | verification_record_id | admin_user_id | action  | comment          | created_at
-- | ---------------------- | ------------- | ------- | ---------------- | ----------
1  | 1                      | 3             | approve | Docs look good   | 2026-04-30
2  | 1                      | 3             | note    | Follow-up needed | 2026-05-01
```

### Why it cannot be merged into `verification_records`

`verification_records` stores the **current state** — one row per entity.
`verification_log` stores the **history** — many rows per entity, one per
admin action.

This is the same many-to-one pattern as `announcement_views`:

```
verification_records (1) ──── (many) verification_log
```

If you merged the log into `verification_records`, you could only store the
last admin action. All prior actions would be lost. The landlord history
endpoint relies on this:

```sql
-- admin/landlords.php — fetches full history
SELECT vl.created_at, vl.action, vl.comment, u.first_name, u.last_name
FROM verification_log vl
JOIN verification_records vr ON vl.verification_record_id = vr.id
JOIN users u ON vl.admin_user_id = u.id
WHERE vr.entity_type = 'user' AND vr.entity_id = ?
```

### Why it cannot be merged into `users`

An admin can act on a verification multiple times. Storing that history
directly on `users` would require either a JSON column or a separate log
table — which is exactly what `verification_log` already is.

---

## Full Picture

| Table                   | Role                           | Rows per landlord | Can merge?                                           |
| ----------------------- | ------------------------------ | ----------------- | ---------------------------------------------------- |
| `account_statuses`      | Lookup — valid account states  | 1 (shared)        | No — has `is_active` behavior                        |
| `verification_statuses` | Lookup — valid review outcomes | 1 (shared)        | No — FK integrity + shared by all entities           |
| `verification_records`  | Current verification state     | 1                 | No — entity-agnostic, not all users need it          |
| `verification_log`      | Audit trail of admin actions   | 0 to N            | No — many rows per record, history must be preserved |

---

## Why `property_type` Was Converted to VARCHAR but These Were Not

`property_type` on `landlord_profiles` was a lookup table with 4 static values
and **no behavior attached**. It was converted to VARCHAR because:

- No `is_active` flag
- No FK-enforced integrity needed
- Values never change at runtime
- No metadata beyond the name itself

`account_statuses` has `is_active` — behavior the middleware depends on.
`verification_statuses` is a FK target shared across multiple entity types.
Neither qualifies for the VARCHAR simplification.
