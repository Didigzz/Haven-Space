# Spec — Landlord verification documents → Admin review modal

**Status:** Implemented — see §15 for what shipped and how the open questions were resolved
**Date:** 2026-09-29
**Scope owner:** product request from the user, 2026-09-29
**Related docs:** [AGENTS.md](AGENTS.md), [report.md](report.md), [qa-full-system-review-spec.md](qa-full-system-review-spec.md)

---

## 1. Request (verbatim)

> after the landlord , submit the documents , the Admin should be able to see the documents in application(after clicking the name of the landlord ) and then a modal shows up and see the documents

Two attachments were supplied as the visual target:

1. **Landlord `/landlord/verification`** — "Account verification" card, status pill, two dashed upload boxes ("Valid government ID", "Proof of property ownership"), green "Submit documents" button.
2. **Admin `/admin` Command Center → Applications tab** — table with `Boarder / Boarder email / Landlord / Room / Status / Applied`; the **Landlord** cell (`Lina Santos`) is the intended click target.

---

## 2. Problem statement

Today the landlord verification page is a **pure UI stub** and the admin console has **no way to see what a landlord submitted**.

Verified in code ([verification.tsx](apps/web/src/routes/landlord/verification.tsx)):

- Two `<input type="file">` handlers write to local `useState` only.
- "Submit documents" is disabled until both files are chosen, and its `onClick` merely does
  `setNote('Document upload is recorded locally. Upload to the API will be wired once the verification endpoint is finalized.')`.
- **There is no upload endpoint, no persistence, no table, and no API client call.** Nothing survives a refresh.

On the admin side:

- `GET /api/admin/applications` → `getAdminApplications(db)` returns rows typed `AdminApplicationRow`, which contains `landlord_first` / `landlord_last` but **no `landlord_id`** ([admin-dashboard.ts](workers/api/src/repositories/admin-dashboard.ts), [types.ts](apps/web/src/lib/types.ts)). The Applications table therefore cannot even identify which landlord to look documents up for.
- The landlord name in [admin/index.tsx](apps/web/src/routes/admin/index.tsx) is rendered as a plain string in a `Column` with no click handler.
- `getAdminLandlordDetail` ([admin-landlords.ts](workers/api/src/repositories/admin-landlords.ts)) returns landlord header + `property_locations` only — **no document fields exist anywhere in the schema** (`grep` for document/upload columns across `workers/api/migrations/` finds only `house_rules_file_url/name/size` on `landlord_profiles`).

So this is a **net-new feature spanning migration + repository + endpoints + two UI surfaces**, not a wiring task.

---

## 3. Existing infrastructure this feature must reuse

| Concern | Existing thing | Location |
| --- | --- | --- |
| File storage | **UploadThing** (`UTApi`), helper `uploadFilesToUploadThing(env, files, metadata)` | [uploadthing.ts](workers/api/src/lib/uploadthing.ts) |
| File deletion (best effort) | `deleteUploadThingFileByUrl(env, url)` + `uploadThingFileKeyFromUrl` | [uploadthing.ts](workers/api/src/lib/uploadthing.ts) |
| Local/test injection | `env.UPLOADTHING_UPLOAD_FILES`, `env.UPLOADTHING_DELETE_FILES` | [env.ts](workers/api/src/env.ts) |
| Multipart upload precedent | `handleAvatarUpload` — `c.req.formData()`, 2 MB cap, MIME allow-list, 502 on UploadThing failure | [account.ts](workers/api/src/routes/account.ts) |
| Admin auth guard | `requireAdmin(c)` → `403 "Access denied. Admins only."` | [admin.ts](workers/api/src/routes/admin.ts) |
| Admin decision endpoint | `POST /api/admin/landlords {landlordId, action:'approve'\|'reject'}` | [admin.ts](workers/api/src/routes/admin.ts) |
| Landlord flags mutation | `updateLandlordVerification(db, id, action)` | [admin-landlords.ts](workers/api/src/repositories/admin-landlords.ts) |
| Landlord status column | `landlord_profiles.verification_status TEXT DEFAULT 'pending'` | [0016_onboarding_fields.sql](workers/api/migrations/0016_onboarding_fields.sql) |
| Audit trail | `insertAdminAuditLog(db, actorId, entity, ids, action)` + Audit log tab | [admin-dashboard.ts](workers/api/src/repositories/admin-dashboard.ts) |
| Notifications | `notifications(user_id, type, title, message, metadata)` + insert precedents | [0009_notifications.sql](workers/api/migrations/0009_notifications.sql), [property-access/history.ts](workers/api/src/repositories/property-access/history.ts) |
| Modal primitive | `components/ui/Modal.tsx` — glassmorphism, ESC to close, **fixed `max-w-lg`**, no focus trap | [Modal.tsx](apps/web/src/components/ui/Modal.tsx) |
| Toast feedback | `useToasts` / `ToastStack` | [admin/index.tsx](apps/web/src/routes/admin/index.tsx) |
| Skeletons | `TableSkeleton`, `StatsGridSkeleton`, `SettingsSkeleton` | [AdminSkeletons](apps/web/src/components/admin/AdminSkeletons.tsx) |

Next free migration number: **`0018_`**.

---

## 4. Decisions (from the interview)

Each row cites the question that produced it.

| # | Decision | Source |
| --- | --- | --- |
| D1 | The clickable landlord name lives in the **Applications tab only**; clicking it opens the document modal. | Round 1 — entry point |
| D2 | Files are stored in **UploadThing**; D1 stores the CDN URL + filename + size + MIME type. | Round 1 — file storage |
| D3 | The modal is **View + Approve/Reject** — the admin decides from inside the modal, reusing the existing landlord-verification endpoint. | Round 1 — modal scope |
| D4 | **Four fixed document slots**: Government ID, Proof of property ownership, Business permit, Selfie holding the ID. | Round 2 — slot list |
| D5 | **One bundle, one status.** Each slot is its own row with its own file; pressing Submit flips the whole set to "pending review". No per-slot review states. | Round 2 — submission model |
| D6 | **Approve is blocked until all four slots hold a file**, with an explanation in the modal. | Round 2 + follow-up round |
| D7 | After rejection the landlord **may re-upload**, and the admin sees **only the latest files** (no version history). | Round 2 — after rejection |
| D8 | **No grandfathering, no exceptions:** the four-slots rule applies to landlords registered before this feature too. | Follow-up round (resolves the round-2/round-3 conflict) |
| D9 | The admin can send a **"Request documents"** notification to the landlord asking for missing documents. | Follow-up round — nudge landlord |
| D10 | **No seed data.** QA must upload real files through UploadThing; the demo landlord is not pre-populated. | Follow-up round — seed |
| D11 | On the landlord page: **status pill reflects the decision**, and a rejected landlord gets a reason/banner with **upload slots unlocked** to re-submit. | Follow-up round — landlord view |
| D12 | **Both sides are in scope** — the landlord upload endpoint/persistence *and* the admin modal. | Follow-up round — scope |
| D13 | The modal shows a **full landlord header** (name, email, boarding house, joined date, verification status) plus the four documents. | Follow-up round — modal content |

### 4.1 Assumptions I made (the fourth interview batch was dismissed)

These were not answered; I chose the option marked "(Recommended)" in the dismissed batch and flag them for confirmation. Treat section §11 as the sign-off list.

| # | Assumption | Chosen value |
| --- | --- | --- |
| A1 | Per-file size cap | **5 MB** per file (avatar precedent is 2 MB; phone photos of documents need headroom) |
| A2 | Formats | **JPG / PNG / WebP** in every slot; **PDF additionally allowed** for Proof of ownership and Business permit only (ID + selfie must be images) |
| A3 | Modal presentation | **Labelled thumbnail grid, click-to-zoom**; PDFs open in a new browser tab |
| A4 | Side effects of an admin decision | Audit-log row **+** landlord notification **+** existing `users` flag update **+** mirror into `landlord_profiles.verification_status` |
| A5 | File visibility | **Admins only** via the document endpoint; the landlord sees filenames, sizes and status for their own uploads, never other landlords' files |
| A6 | Reject reason | Optional free-text on reject, surfaced to the landlord; **not mandatory** (round 1 picked the plain "Approve/Reject in modal" variant, not "reject with reason") |

---

## 5. Landlord-side specification

### 5.1 Page: `/landlord/verification`

`Route = createFileRoute('/landlord/verification')`, still wrapped in `<Protected role="landlord">` + `<RoleShell title="Verification" nav={LANDLORD_NAV}>` ([verification.tsx](apps/web/src/routes/landlord/verification.tsx)).

The single `Card` becomes four slot rows (D4). Each row:

```
┌────────────────────────────────────────────────────────────┐
│ Government ID                        [ ✓ Uploaded ]        │
│ ┌────────────────────────────────────────────────────────┐ │
│ │  id-front.jpg · 1.2 MB · uploaded Sep 29     [Choose]  │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

- Slot label + short helper text ("JPG/PNG, max 5 MB").
- Empty state: dashed box, caption from the current page (`Choose an ID image (jpg/png)`, `Choose a document (jpg/png/pdf)`), now per slot.
- Filled state: filename, human size, upload timestamp, plus **Replace** and **Remove** affordances.
  - *Remove:* soft-delete the row; if the bundle was `submitted`, status returns to `pending`. Removing the last file in a rejected bundle leaves the page showing the rejected banner with empty slots.
- Upload is fired **immediately on file selection** (per-slot), not on Submit — so a partial bundle persists across refreshes. Submit is what flips the bundle to *under review*.
- Per-slot inline error for size/format rejection and for UploadThing failure (502 → "Upload failed, try again").
- "Submit documents" enabled only when all four slots hold a file **and** status is not `approved`; otherwise disabled with helper text naming the missing slots.
- Status pill: `pending` / `submitted` / `approved` / `rejected` (`not_submitted` renders as `pending`). Rejected adds a reason banner (A6) and keep the slots editable (D11).
- "← Back to dashboard" link unchanged.

**Status semantics (D5/D11):**

| `verification_status` | Landlord sees | Slots editable? | Submit allowed? |
| --- | --- | --- | --- |
| `pending` | "Pending — upload all four documents" | yes | only when 4/4 present |
| `submitted` | "Submitted — reviewed within 24–48 hours" | yes (replacing returns to `pending`) | no (already submitted) |
| `approved` | "Approved" | **locked** (see OQ-1) | no |
| `rejected` | "Rejected" + reason banner | yes | only when 4/4 present |

### 5.2 Client data source

Do **not** read status off the JWT. `userPayload` derives the landlord's `verification_status` as `is_verified ? 'approved' : 'pending'` ([auth/helpers.ts](workers/api/src/routes/auth/helpers.ts)) — it can never express `submitted` or `rejected`, and it is stale until the token refreshes.

Instead the page fetches `GET /api/landlord/verification` (see §7.2), which returns the authoritative status plus the four slots. Changes to that endpoint also keep `landlord_profiles.verification_status` as the single source of truth, mirroring how the property-access tab fetches its own data.

### 5.3 Draft copy (descriptive, not final)

> **Account verification** — Verification status: `submitted`
> To complete verification, upload a valid government-issued ID, proof of property ownership, a business permit, and a selfie holding your ID. Your account is reviewed within 24–48 hours.

---

## 6. Data model

### 6.1 New migration `workers/api/migrations/0018_landlord_verification_documents.sql`

```sql
CREATE TABLE IF NOT EXISTS landlord_verification_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  document_type TEXT NOT NULL,          -- government_id | proof_of_ownership | business_permit | selfie_with_id
  file_url TEXT NOT NULL,               -- UploadThing CDN URL
  file_key TEXT,                        -- UploadThing key, for deleteUploadThingFileByUrl
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,                       -- MIME type as reported by the browser
  uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- latest-file-only semantics (D7): one live row per slot per landlord
CREATE UNIQUE INDEX IF NOT EXISTS idx_lvd_user_type
  ON landlord_verification_documents(user_id, document_type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lvd_user
  ON landlord_verification_documents(user_id, deleted_at);
```

Seeding requirement: **none** (D10). Note the partial unique index above — SQLite/D1 supports `WHERE` on `CREATE UNIQUE INDEX`, which lets a re-upload soft-delete the old row and insert a fresh one without tripping the constraint. Alternative if the partial index proves awkward in D1: hard-delete the previous row inside the same `db.batch()` as the insert.

### 6.2 Additions to `landlord_profiles`

```sql
ALTER TABLE landlord_profiles ADD COLUMN verification_reviewed_at TEXT;
ALTER TABLE landlord_profiles ADD COLUMN verification_reviewed_by INTEGER;   -- admin users.id
ALTER TABLE landlord_profiles ADD COLUMN verification_note TEXT;             -- rejection reason / documents-requested note
```

`verification_status` already exists (default `'pending'`) — no new column; extend its vocabulary to `pending | submitted | approved | rejected`.

### 6.3 Unit-of-work rules

- **Upload** (per slot): best-effort delete the previous UploadThing file for that slot → upsert the row → if the previous status was `rejected` or `approved`, set `verification_status='pending'` and clear `verification_note`/`verification_reviewed_at`/`verification_reviewed_by`.
- **Submit**: requires 4/4 live rows; sets `verification_status='submitted'`; 400 listing which slots are missing otherwise.
- **Approve** (admin): requires 4/4 live rows (D6/D8) → `updateLandlordVerification('approve')` (existing flag logic) → `verification_status='approved'`, stamp reviewer → audit log → notify landlord.
- **Reject** (admin): `verification_status='rejected'`, store optional reason, stamp reviewer → audit log → notify landlord with reason.
- **Request documents** (admin): store note, notify landlord, audit log. Does **not** change `verification_status` (no dedicated state; OQ-4).

---

## 7. API contract

All response fields `snake_case` (AGENTS.md convention). All admin routes keep the `requireAdmin` guard and the existing `403 "Access denied. Admins only."` body.

### 7.1 UploadThing metadata

Every upload passes `{ userId, purpose: 'verification_document', documentType }` as metadata, matching the avatar precedent (`{userId, purpose:'avatar'}`). This makes verification uploads distinguishable in the UploadThing dashboard.

### 7.2 Landlord endpoints (new module `workers/api/src/routes/landlord/verification.ts`)

#### `GET /api/landlord/verification`

Role: `landlord`.

```json
{
  "data": {
    "verification_status": "submitted",
    "note": null,
    "reviewed_at": null,
    "documents": [
      { "document_type": "government_id",     "submitted": true,  "file_name": "id.jpg",      "file_size": 1228800, "file_type": "image/jpeg", "file_url": "https://….utfs.io/f/…", "uploaded_at": "2026-09-29 10:11:12" },
      { "document_type": "proof_of_ownership","submitted": false, "file_name": null, "file_size": null, "file_type": null, "file_url": null, "uploaded_at": null },
      { "document_type": "business_permit",   "submitted": true,  "…": "…" },
      { "document_type": "selfie_with_id",    "submitted": true,  "…": "…" }
    ]
  }
}
```

Always returns all four slots in a fixed order — the client never has to invent missing ones.

#### `POST /api/landlord/verification/documents`

`multipart/form-data` with fields `document_type` (string) and `file` (File). Mirrors `handleAvatarUpload` step for step.

Validation, in order:

| Condition | Response |
| --- | --- |
| not a landlord | `403` |
| `document_type` not one of the four | `400 "Invalid document type"` |
| no valid file part | `400 "No valid file uploaded"` |
| `file.size > 5 MB` (A1) | `400 "File size must be less than 5MB"` |
| MIME not allowed for the slot (A2) | `400 "Invalid file type. Allowed: JPEG, PNG, WebP"` / `… , PDF` |
| UploadThing returns error | `502` with the UploadThing message (avatar precedent) |
| UploadThing returns no URL | `502 "UploadThing did not return a file URL"` |

Success — `200`:

```json
{ "message": "Document uploaded successfully",
  "data": { "document_type": "business_permit", "file_url": "https://…", "verification_status": "pending" } }
```

#### `DELETE /api/landlord/verification/documents/:documentType`

Soft-deletes the live row, best-effort deletes the UploadThing file, and returns the bundle status to `pending`. `404 "Document not found"` when the slot is empty. *Optional — include only if the Remove affordance in §5.1 is kept.*

#### `POST /api/landlord/verification/submit`

No body. `400` when any slot is empty, with the missing types in the message (e.g. `"Missing documents: business_permit, selfie_with_id"`); `200 { message: "Documents submitted for review" }` otherwise.

### 7.3 Admin endpoints

#### `GET /api/admin/landlords?id=<landlordId>` — **extend, do not add a new route**

The existing detail branch already returns the full landlord header the modal needs (name, email, `boarding_house_name`, `is_verified`, `created_at`, `property_locations`). Add a `documents` array to `AdminLandlordDetailRow` so the modal is a **single fetch**:

```json
{ "data": {
    "id": 6, "first_name": "Lina", "last_name": "Santos", "email": "lina@example.com",
    "is_verified": 0, "created_at": "2026-09-01 08:00:00", "boarding_house_name": "Lina's Boarding House",
    "property_locations": [ … ],
    "verification_status": "submitted",
    "documents_complete": false,
    "missing_documents": ["business_permit", "selfie_with_id"],
    "documents": [ { "document_type": "government_id", "file_name": "id.jpg", "file_size": 1228800,
                     "file_type": "image/jpeg", "file_url": "https://…", "uploaded_at": "…" } ]
} }
```

`documents_complete` + `missing_documents` are server-computed so the client does not re-derive the approve gate. `404 "Landlord not found"` unchanged.

#### `POST /api/admin/landlords` — **extend**

Body: `{ landlordId, action, reason? }` with `action ∈ { 'approve', 'reject', 'request_documents' }`. `reason` is optional (A6) and used by `reject` / `request_documents`.

Behaviour changes:

| action | Before | After |
| --- | --- | --- |
| `approve` | always succeeded (404 only if no row changed) | **`409 "All four verification documents are required before approval"` when `documents_complete` is false** (D6/D8); otherwise unchanged flag update + `verification_status='approved'` |
| `reject` | `is_verified=0` | `is_verified=0` + `verification_status='rejected'` + store reason |
| `request_documents` | n/a | new; stores note, notifies landlord, **no** flag change |

All three paths append `insertAdminAuditLog(db, actorId, 'landlord_verification', [landlordId], action)`.

> ⚠️ **Consequence to accept explicitly.** D8 makes approve depend on documents for *every* landlord. With the current seed data the admin console shows **"Landlord verification 1 — awaiting approval"**; that landlord cannot be approved until they upload four files. Existing `workers/api/test/` coverage of `POST /api/admin/landlords action=approve` will start returning 409 and must be updated to seed documents first. If this is unacceptable for demo/QA, flip to OQ-2.

#### `GET /api/admin/applications` — **extend**

Add `landlord_id` (and, cheaply, `property_id`) to `AdminApplicationRow` by selecting `lf.id AS landlord_id` in `getAdminApplications`'s existing join. Without this the Applications table cannot address the modal (D1). Touches [admin-dashboard.ts](workers/api/src/repositories/admin-dashboard.ts) + [types.ts](apps/web/src/lib/types.ts).

---

## 8. Admin-side UI specification

### 8.1 Applications table (`tab === 'applications'`)

`applicationColumns` in [admin/index.tsx](apps/web/src/routes/admin/index.tsx) — the Landlord cell becomes a button:

```tsx
{ header: 'Landlord',
  cell: row => (
    <button type="button"
      className="text-left text-sm font-medium text-primary hover:underline
                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      onClick={() => setDocumentLandlordId(row.landlord_id)}>
      {`${row.landlord_first} ${row.landlord_last}`}
    </button>
  ) },
```

- Must not collide with selection mode: when `appsSelectMode` is true, the whole row is a multi-select row. Suppress the name button (render plain text) while `appsSelectMode` is on, so clicking a name never toggles a checkbox or opens the modal mid-selection.
- Multiple rows for the same landlord open the same modal (documents are per landlord, not per application) — this is fine and expected; the modal title names the landlord, not the application.
- Row hover should hint clickability; keep it touch-friendly (≥44 px hit area) since the panel is also used at ~1200 px widths.

### 8.2 `LandlordDocumentsModal`

New component, e.g. `apps/web/src/components/admin/LandlordDocumentsModal.tsx`, mounted once in `AdminOverview` next to the existing confirm `Modal`:

```tsx
const [documentLandlordId, setDocumentLandlordId] = useState<number | null>(null);
<LandlordDocumentsModal
  landlordId={documentLandlordId}
  token={token!}
  onClose={() => setDocumentLandlordId(null)}
  onDecided={() => { invalidate(); setDocumentLandlordId(null); }}
/>
```

Uses the existing `Modal` primitive (ESC-to-close for free, D13 header):

- **Title:** `Verification documents — Lina Santos`
- **Header block:** email, boarding house (`—` when null), joined date, verification status badge (`StatusBadge`), and a "documents 3 of 4" completeness chip.
- **Body:** four labelled slots in fixed order. Each shows a thumbnail (image slots) or a PDF glyph, filename, size, uploaded date, and an **Open** link; clicking a thumbnail enlarges it inline (A3). Empty slots render a dashed "Not submitted" placeholder.
- **Footer:** `Approve` (primary) · `Reject` (red, matching the existing destructive styling) · `Request documents` (outline) · `Close` (ghost).
  - **Approve is `disabled` when `documents_complete === false`**, with helper text `Missing: Business permit, Selfie holding the ID` — the server also enforces this with 409 (defence in depth).
  - Reject / Request documents open a small inline reason field (optional, A6).
  - All three mutations use a `useMutation` calling `updateLandlordVerification` (extended with `action`/`reason`) and push a toast via `useToasts`, exactly like `patchLandlord` does today.
- **States:** loading skeleton (reuse `SettingsSkeleton`-style blocks), `ErrorState` on failure (including the 403/404 bodies), and an empty state when the landlord has zero documents.
- The modal must **not** reuse the sticky bulk bar; it acts on one landlord only.

### 8.3 `Modal` sizing

`components/ui/Modal.tsx` is hard-coded to `max-w-lg`, which is too narrow for a 2×2 document grid. Add an optional `size?: 'md' | 'lg' | 'xl'` prop defaulting to `'md'` (preserving today's `max-w-lg`) and pass `'xl'` here. Keep `AnimatePresence` + backdrop-click behaviour untouched so the four existing modal call sites are unaffected.

---

## 9. Permissions, privacy, audit

- **Endpoint guards:** landlord endpoints require `role === 'landlord'` and operate only on the caller's own `user_id` (never a body-supplied id — no IDOR). Admin endpoints keep `requireAdmin`.
- **Who can fetch the files (A5):** admins only through the API. The landlord's own page receives their own `file_url`s so they can verify what they uploaded; no other role ever sees them.
- **Sensitive data note:** these are government IDs, business permits and selfies — sensitive personal data under the Philippine Data Privacy Act (RA 10173). UploadThing CDN URLs are unlisted but **publicly reachable by anyone holding the link**, so `file_url` must never leak into boarder-, public- or listing-facing payloads. If a stricter posture is wanted, store `file_key` and serve bytes through an authenticated admin proxy instead of handing out CDN URLs (see OQ-3).
- **Audit:** every admin decision and every `request_documents` writes one `admin_audit_log` row with `entity='landlord_verification'`, `ids=[landlordId]`, `action` = the action taken. The existing Audit log tab renders it with no changes.
- **Retention:** documents are kept after rejection (needed for re-submission, D7) and removed by `ON DELETE CASCADE` when the landlord's user row is deleted. No automatic TTL.
- **Notifications (A4, D9):** three new `type` values — `landlord_verification_approved`, `landlord_verification_rejected`, `landlord_verification_documents_requested` — inserted with the same `INSERT INTO notifications (user_id, type, title, message, metadata)` shape as `createPropertyInvitationNotification`, with `metadata` carrying `{ landlord_id, reviewed_by, reason }`.

---

## 10. Test plan

### 10.1 API (`bun run cf:api:test`)

New `workers/api/test/landlord-verification.test.ts`, modelled on `landlord-photos.test.ts` / `account.test.ts`:

- Upload success per slot → row created, `file_url` recorded, `200` shape exact.
- Oversize file → 400 with the exact message; wrong MIME per slot → 400; PDF accepted for ownership/permit but rejected for ID/selfie.
- Non-landlord role → 403; missing `document_type` → 400; missing file part → 400.
- UploadThing returning `{ data: null, error }` → 502 and **no** row written (the `landlord-photos.test.ts` failure assertion pattern).
- Re-upload replaces the row, deletes the previous UploadThing key (`UPLOADTHING_DELETE_FILES` spy), and resets `rejected`/`approved` → `pending`.
- `GET /api/landlord/verification` always returns four slots in fixed order with nulls for missing ones.
- `POST …/submit` with 3/4 slots → 400 naming the missing type; with 4/4 → `submitted`.

Extend `workers/api/test/admin.test.ts` (or the existing admin suite):

- `GET /api/admin/landlords?id=` includes `documents`, `documents_complete`, `missing_documents`.
- `POST /api/admin/landlords approve` with an incomplete bundle → **409** and `is_verified` unchanged.
- approve with 4/4 → `is_verified=1`, `account_status='active'`, `verification_status='approved'`, one audit row, one notification.
- reject with reason → `verification_status='rejected'`, reason persisted and returned to the landlord.
- `request_documents` → notification only, status unchanged.
- non-admin → 403 on every new/extended route.
- `GET /api/admin/applications` now includes `landlord_id` and the field matches the row's property owner.

### 10.2 Web (`bun run web:test`)

- Applications table renders the landlord name as a button and calls the open handler with the row's `landlord_id`.
- The name button is inert (plain text) while `appsSelectMode` is true.
- Modal: renders four slots, distinguishes submitted vs missing, disables Approve with the missing list when incomplete, and closes on ESC.
- Landlord page: renders four slots, shows the reject reason banner, disables Submit until 4/4.

### 10.3 Typecheck

`bun run cf:api:typecheck` and `bun run web:typecheck` must both stay clean — the `AdminApplicationRow` / `AdminLandlordDetailRow` type edits ripple into [types.ts](apps/web/src/lib/types.ts) and the API client.

### 10.4 Manual QA pass (no seed data, D10)

1. Log in as a fresh landlord (`…@example.com` under `Landlord123!` or a new signup) → `/landlord/verification`.
2. Upload four real files (one deliberately oversized first, to see the 400, then a valid one).
3. Confirm the pill moves `pending → submitted` and that a page refresh keeps all four files.
4. Log in as `admin@example.com` / `AdminPass123` → `/admin` → **Applications** tab → click the landlord name in a row.
5. Confirm the modal shows the header, four thumbnails (and a PDF opening in a new tab), and `4 of 4`.
6. Reject with a reason → toast + Audit log row + landlord sees the reason and the unlocked slots.
7. Re-upload a replacement → confirm only the latest file shows for the admin.
8. Approve → landlord's slot set locks and the pill reads `approved`; the summary tile "awaiting approval" decrements.
9. Negative checks: an incomplete bundle leaves Approve disabled **and** a direct `POST` returns 409; a boarder token gets 403 on `/api/admin/landlords?id=`.

---

## 11. Assumptions awaiting sign-off

Everything in §4.1, plus the two behavioural calls below that are the most likely to be wrong:

- **A7 — `approved` locks the slots.** §5.1 assumes an approved landlord cannot swap documents without an admin unlocking them. If document replacement should stay open post-approval, the only change is that uploads keep the `approved` status rather than resetting to `pending`.
- **A8 — `request_documents` has no state of its own.** The bundle stays `pending`; the nudge is a notification + a note on the profile. If admins need a visible "awaiting documents" queue state, that is a fifth status value.

---

## 12. Open questions

- **OQ-1** Locked-after-approval vs always-editable (A7) — pick one.
- **OQ-2** Given D8, the one landlord currently awaiting approval in the local/seed DB becomes un-approvable. Is that the intended demo behaviour, or should the QA seed landlord be given four documents anyway (which contradicts D10)?
- **OQ-3** Accept unlisted-but-public UploadThing CDN URLs for government IDs, or proxy the bytes through an authenticated admin endpoint? The latter is materially more work (streaming, `Content-Disposition`, no caching) but is the only way to make the files genuinely private.
- **OQ-4** Does "Request documents" deserve its own `verification_status` so admins can filter landlords who were asked and haven't responded?
- **OQ-5** Should the summary tile "Landlord verification — awaiting approval" now count landlords with a **complete bundle awaiting review** rather than `users.is_verified = 0`? Today it counts the latter, so it will disagree with the approve gate.
- **OQ-6** Notification delivery: an in-app `notifications` row is in scope; **email is not** (the repo sends no mail locally). Confirm in-app is sufficient for the first cut.
- **OQ-7** Mobile behaviour of the modal: at narrow widths the 2×2 grid should collapse to one column with the footer buttons stacked full-width. Worth confirming the target breakpoints.

---

## 13. Non-goals

- No email/SMS delivery for verification decisions.
- No document **version history** for the admin (D7).
- No per-slot review statuses (D5).
- No OCR / automated ID validation.
- No changes to the boarder-facing application flow.
- No changes to what `POST /api/admin/landlords` does to `account_status` on approve (existing behaviour preserved).
- No new Landlords-tab or dedicated verification tab in the admin console (D1).

---

## 14. File-by-file change list

**API**

| File | Change |
| --- | --- |
| `workers/api/migrations/0018_landlord_verification_documents.sql` | new table + indexes; `ALTER landlord_profiles` for reviewer columns |
| `workers/api/src/repositories/landlord-verification.ts` | **new** — upsert/list/soft-delete documents, set bundle status, submit guard |
| `workers/api/src/routes/landlord/verification.ts` | **new** — `GET /`, `POST /documents`, `POST /submit`, optional `DELETE /documents/:type`; registered alongside the other `landlordRoutes` |
| `workers/api/src/routes/admin.ts` | extend landlord detail handler with documents + completeness; extend `POST /api/admin/landlords` with the 409 gate, `request_documents`, reason, audit log, notification |
| `workers/api/src/repositories/admin-landlords.ts` | `AdminLandlordDetailRow` + document fields; `documents_complete` / `missing_documents` derivation; `updateLandlordVerification` gains status/reason writes |
| `workers/api/src/repositories/admin-dashboard.ts` | `getAdminApplications` selects `landlord_id`, `property_id`; `AdminApplicationRow` extended |
| `workers/api/src/repositories/notifications.ts` (or `property-access/history.ts` pattern) | three verification notification inserters |

**Web**

| File | Change |
| --- | --- |
| `apps/web/src/routes/landlord/verification.tsx` | four slots, immediate upload, replace/remove, status + reject banner, real submit |
| `apps/web/src/routes/admin/index.tsx` | clickable landlord cell, `documentLandlordId` state, mount the modal, suppress the button in select mode |
| `apps/web/src/components/admin/LandlordDocumentsModal.tsx` | **new** — header, document grid, approve/reject/request-documents |
| `apps/web/src/components/ui/Modal.tsx` | optional `size` prop (`md` default) |
| `apps/web/src/lib/api/admin.ts` | `getLandlordDetail(id)`; `updateLandlordVerification` gains `action: 'request_documents'` + `reason` |
| `apps/web/src/lib/api/landlord.ts` (or the existing landlord client module) | `getVerification`, `uploadVerificationDocument`, `submitVerification`, `removeVerificationDocument` |
| `apps/web/src/lib/types.ts` | `AdminApplicationRow.landlord_id`, `AdminLandlordDetail` + document types, landlord verification response types |

---

## 15. Implementation status (2026-09-29)

This spec was implemented in the same session. Everything in §1–§14 shipped, with these resolutions of the open questions:

| Question | Resolution as built |
| --- | --- |
| A7 / OQ-1 (post-approval edits) | **Locked.** An `approved` bundle renders read-only with "Contact support if you need to change a document". The server would still accept a replacement (resetting the bundle to `pending`), so the lock is a UI guarantee, not an API guarantee. |
| OQ-2 (un-approvable legacy landlord) | **Accepted as designed.** The approve gate is unconditional; the local demo landlord must upload four files before approval. `e2e-flow.test.ts` now seeds a complete bundle before approving. |
| OQ-3 (public CDN URLs) | **Accepted for now.** Documents use UploadThing URLs exactly like avatars and listing photos. A private proxy remains a follow-up (§12 OQ-3). |
| OQ-4 (request-documents state) | **No new state.** `setVerificationNote` stores the note without touching `verification_status`, so a prior rejection is not silently discarded. |
| OQ-5 (summary tile) | **Left unchanged** — still counts `users.is_verified = 0`, which will over-count once some landlords have submitted bundles. |
| OQ-6 (notification channel) | **In-app only.** Three new notification types are registered in the landlord's `roleVisibleTypes` allow-list, otherwise the bell would have silently hidden them. |
| OQ-7 (mobile modal) | Grid collapses to one column below `md`; the modal scrolls (`max-h-[90vh] overflow-y-auto`) on short viewports. |

Verification: `bun run cf:api:typecheck`, `bun run web:typecheck`, `bun run cf:api:test` (**257 pass**), `bun run web:test` (**86 pass**). New coverage lives in `workers/api/test/landlord-verification.test.ts` (14 tests) and `apps/web/test/landlord-documents-modal.test.tsx` (5 tests).

Not done: `migrate:remote` for the deployed D1, and a live browser pass through the real UploadThing account — both need credentials/decisions and were left to the user.

