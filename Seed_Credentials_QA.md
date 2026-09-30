# Haven Space — Local QA Credentials

> **LOCAL QA ONLY.** These accounts exist only in the local `wrangler d1` database (`workers/api/.wrangler/state/v3/d1`).
> Never use them against staging or production. The local dataset may be wiped, reseeded, or mutated at any time during the sweep.
> Run id for this sweep: **20260922-2316**

## 1. Base fixture accounts (must exist before a flow starts)

| Role                       | Email                             | Password           | DB state (verified 2026-09-22 23:16)                                                              | Purpose                                             |
| -------------------------- | --------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Admin                      | `admin@example.com`               | `AdminPass123`     | `users.id=6`, `role=admin`, `is_verified=1`, `email_verified=1`, `account_status=active` (created by this run) | Admin tabs, landlord approvals, moderation, audit log |
| Landlord (demo, verified)  | `lina.santos@haven.demo`          | `Landlord123!`     | `users.id=3`, verified; owns properties `1` Sunrise Boarding House, `4` Casa Amara Boarding House   | Primary landlord fixtures                           |
| Landlord (demo, verified)  | `ramon.delacruz@haven.demo`       | `Landlord123!`     | `users.id=4`, verified; owns properties `2` Greenfield Dormitory, `5` Baguio Pine Haven            | Second landlord                                     |
| Landlord (demo, verified)  | `maria.reyes@haven.demo`          | `Landlord123!`     | `users.id=5`, verified; owns properties `3` Taft Tower Residences, `6` University Haven Dorm        | Third landlord                                      |
| Boarder (Google-linked)    | `amlhungrykat@gmail.com`          | Google sign-in     | pre-existing `users.id=2`, `google_id` set, verified                                               | OAuth existing-account path, boarder journey        |
| Boarder (email/password)   | `2401115560@student.buksu.edu.ph` | known to owner     | pre-existing `users.id=1`, verified                                                                | Password login journey, second boarder              |

Login smoke (API `POST /api/auth/login`): all three demo landlords → `200`, `admin@example.com` → `200` (`role=admin`), `admin@example.com` + wrong password → `401`.

## 2. Per-run accounts (`<runid>` = `20260922-2316`)

Created by the harness through the **API register endpoint** (`POST /api/auth/register`) rather than the signup UI — the interface was only probed for render (W2-R2/R4/R13), so the signup *form* itself is not covered by these accounts. Current state after the W2–W5 sweeps:

| Role                      | Email                                    | Password        | Status (verified 2026-09-25)                                                   | Exercises                          |
| ------------------------- | ---------------------------------------- | --------------- | ------------------------------------------------------------------------------ | ---------------------------------- |
| Landlord (unverified, QA) | `qa.landlord.20260922-2316@example.com`  | `StrongPass123` | `users.id=9`, `account_status=pending_verification`, `is_verified=0`. Approved by W5-A11 and **restored to pending** by W5-A26, so the W4 gate stays testable | Verification gate, admin approval  |
| Boarder (QA, fresh)       | `qa.boarder.20260922-2316@example.com`   | `StrongPass123` | `users.id=7`, active; application `4` **confirmed** (room 1 → `occupied`), one pending leave request | Clean apply → accept → confirm     |
| Boarder (QA, 2nd)         | `qa.boarder2.20260922-2316@example.com`  | `StrongPass123` | `users.id=8`, active; application `6` rejected (room 2)                         | Multi-apply, double-booking, edge cases |
| Boarder (reset-chain, QA) | `qa.reset.20260922-2316@example.com`     | `ResetPass456`  | `users.id=10`, active. Its original `StrongPass123` was replaced when W2 completed the password-reset chain | Password-reset end-to-end          |

## 3. Seeded data inventory (local D1, after migrations `0001…0017`)

| Table            | Count | Notes                                                                                          |
| ---------------- | ----- | ---------------------------------------------------------------------------------------------- |
| `users`          | 10    | ids 1–2 pre-existing, 3–5 from `0015`, 6 = QA admin, 7–10 = per-run QA accounts                |
| `properties`     | 6     | ids 1–6, all `available`, two per demo landlord (property 6 was reject→publish moderated in W5)  |
| `rooms`          | 33    | attached to properties 1–6; room 1 is `occupied` after the W3 confirm-booking journey          |
| `applications`   | 2     | `4` confirmed (boarder 7 / room 1), `6` rejected (boarder 8 / room 2)                           |
| `saved_listings` | 2     | both soft-deleted rows from the earlier save/unsave lifecycle check                             |
| `admin_audit_log`| 10    | written by the W5 admin actions; **no API/UI reads this table yet (BUG-10)**                    |

Public listing API for reference: `GET /api/rooms/public` (returns properties + rooms), `GET /api/rooms/detail?id=<propertyId>`.

## 4. Reset guide (wipe → re-migrate → re-seed)

```bash
# 1. stop both dev servers (web :3000, API :8000) so nothing holds the sqlite file
# 2. wipe local D1 state
rm -rf workers/api/.wrangler/state/v3/d1

# 3. re-apply all migrations (0001…0017) — this recreates the 3 demo landlords + 6 properties + 33 rooms
bun run db:setup

# 4. re-create the QA admin (bcryptjs from workers/api, insert via wrangler d1 execute)
cd workers/api
bun -e "import b from 'bcryptjs'; console.log(b.hashSync('AdminPass123',10))"
npx wrangler d1 execute haven-space --local --command \
  "INSERT INTO users (first_name,last_name,email,password_hash,role,is_verified,email_verified,account_status) \
   VALUES ('QA','Admin','admin@example.com','<hash-from-above>','admin',1,1,'active');"

# 5. restart the dev servers (API first, then web)
bun run cf:api:dev
bun run web:dev

# 6. smoke both
curl -s http://localhost:8000/api/health
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3000/auth/login
```

If the frontend ever points at the wrong API base, append `?apiBaseUrl=http://localhost:8000` to the page URL
(`apps/web/src/lib/config.ts` also auto-detects localhost). The web dev server currently binds IPv6 loopback `[::1]:3000`.

## 5. Git handling

This file is **untracked**. Keep it untracked (or add it to `.gitignore`) so QA credentials never enter git history.
