/**
 * Landlord verification documents.
 *
 * Landlords upload four fixed slots; each slot keeps at most one live row so the
 * admin always reviews the latest submission. `landlord_profiles.verification_status`
 * (pending | submitted | approved | rejected) is the bundle-level state the admin's
 * approve gate and the landlord's own page both read.
 */

export const verificationDocumentTypes = [
  'government_id',
  'proof_of_ownership',
  'business_permit',
  'selfie_with_id',
] as const;

export type VerificationDocumentType = (typeof verificationDocumentTypes)[number];

export const verificationDocumentLabels: Record<VerificationDocumentType, string> = {
  government_id: 'Valid government ID',
  proof_of_ownership: 'Proof of property ownership',
  business_permit: 'Business permit',
  selfie_with_id: 'Selfie holding the ID',
};

export const verificationDocumentHints: Record<VerificationDocumentType, string> = {
  government_id: 'JPG or PNG, max 5 MB',
  proof_of_ownership: 'JPG, PNG or PDF, max 5 MB',
  business_permit: 'JPG, PNG or PDF, max 5 MB',
  selfie_with_id: 'JPG or PNG, max 5 MB',
};

/** Slots that accept PDFs in addition to images. The ID and selfie must stay images. */
export const pdfCapableViewDocumentTypes: VerificationDocumentType[] = [
  'proof_of_ownership',
  'business_permit',
];

export const maxVerificationDocumentBytes = 5 * 1024 * 1024;

export type VerificationStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

export interface VerificationDocumentRecord {
  document_type: VerificationDocumentType;
  file_url: string;
  file_key: string | null;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_at: string;
}

/** A slot as the client sees it: always present, with `submitted` describing whether a file exists. */
export interface VerificationDocumentSlot {
  document_type: VerificationDocumentType;
  label: string;
  hint: string;
  accepts_pdf: boolean;
  submitted: boolean;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  file_url: string | null;
  uploaded_at: string | null;
}

export interface LandlordVerificationState {
  verification_status: VerificationStatus;
  note: string | null;
  reviewed_at: string | null;
  documents_complete: boolean;
  missing_documents: VerificationDocumentType[];
  slots: VerificationDocumentSlot[];
}

export function isVerificationDocumentType(value: string): value is VerificationDocumentType {
  return (verificationDocumentTypes as readonly string[]).includes(value);
}

interface VerificationDocumentRow {
  document_type: string;
  file_url: string;
  file_key: string | null;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  uploaded_at: string;
}

function toRecord(row: VerificationDocumentRow): VerificationDocumentRecord {
  return {
    document_type: row.document_type as VerificationDocumentType,
    file_url: row.file_url,
    file_key: row.file_key,
    file_name: row.file_name,
    file_size: row.file_size === null ? null : Number(row.file_size),
    file_type: row.file_type,
    uploaded_at: row.uploaded_at,
  };
}

function normalizeStatus(value: string | null | undefined): VerificationStatus {
  return value === 'submitted' || value === 'approved' || value === 'rejected' ? value : 'pending';
}

/** All four slots in a fixed order, with missing ones rendered as placeholders. */
export function buildVerificationSlots(
  documents: VerificationDocumentRecord[]
): VerificationDocumentSlot[] {
  const byType = new Map(documents.map(document => [document.document_type, document]));

  return verificationDocumentTypes.map(type => {
    const document = byType.get(type);

    return {
      document_type: type,
      label: verificationDocumentLabels[type],
      hint: verificationDocumentHints[type],
      accepts_pdf: pdfCapableViewDocumentTypes.includes(type),
      submitted: Boolean(document),
      file_name: document?.file_name ?? null,
      file_size: document?.file_size ?? null,
      file_type: document?.file_type ?? null,
      file_url: document?.file_url ?? null,
      uploaded_at: document?.uploaded_at ?? null,
    };
  });
}

export function missingVerificationDocumentTypes(
  documents: VerificationDocumentRecord[]
): VerificationDocumentType[] {
  const present = new Set(documents.map(document => document.document_type));

  return verificationDocumentTypes.filter(type => !present.has(type));
}

export function isVerificationComplete(documents: VerificationDocumentRecord[]): boolean {
  return missingVerificationDocumentTypes(documents).length === 0;
}

export async function listVerificationDocuments(
  db: D1Database,
  userId: number
): Promise<VerificationDocumentRecord[]> {
  const rows = await db
    .prepare(
      `
        SELECT document_type, file_url, file_key, file_name, file_size, file_type, uploaded_at
        FROM landlord_verification_documents
        WHERE user_id = ?
          AND deleted_at IS NULL
      `
    )
    .bind(userId)
    .all<VerificationDocumentRow>();

  return (rows.results ?? []).map(toRecord);
}

export async function findVerificationDocument(
  db: D1Database,
  userId: number,
  documentType: VerificationDocumentType
): Promise<VerificationDocumentRecord | null> {
  const row = await db
    .prepare(
      `
        SELECT document_type, file_url, file_key, file_name, file_size, file_type, uploaded_at
        FROM landlord_verification_documents
        WHERE user_id = ?
          AND document_type = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(userId, documentType)
    .first<VerificationDocumentRow>();

  return row ? toRecord(row) : null;
}

export async function getVerificationProfile(
  db: D1Database,
  userId: number
): Promise<{
  verification_status: VerificationStatus;
  note: string | null;
  reviewed_at: string | null;
}> {
  const row = await db
    .prepare(
      `
        SELECT verification_status, verification_note, verification_reviewed_at
        FROM landlord_profiles
        WHERE user_id = ?
        LIMIT 1
      `
    )
    .bind(userId)
    .first<{
      verification_status: string | null;
      verification_note: string | null;
      verification_reviewed_at: string | null;
    }>();

  return {
    verification_status: normalizeStatus(row?.verification_status),
    note: row?.verification_note ?? null,
    reviewed_at: row?.verification_reviewed_at ?? null,
  };
}

/** The full landlord-facing view: bundle status plus every slot in fixed order. */
export async function getLandlordVerificationState(
  db: D1Database,
  userId: number
): Promise<LandlordVerificationState> {
  const documents = await listVerificationDocuments(db, userId);
  const profile = await getVerificationProfile(db, userId);

  return {
    verification_status: profile.verification_status,
    note: profile.note,
    reviewed_at: profile.reviewed_at,
    documents_complete: isVerificationComplete(documents),
    missing_documents: missingVerificationDocumentTypes(documents),
    slots: buildVerificationSlots(documents),
  };
}

/**
 * Records a freshly uploaded file for one slot: soft-deletes the previous live row
 * and resets the bundle to `pending`, because a changed submission must be reviewed
 * again. Callers pass the previous row (when there was one) so they can delete the
 * orphaned UploadThing file.
 */
export async function upsertVerificationDocument(
  db: D1Database,
  input: {
    userId: number;
    documentType: VerificationDocumentType;
    fileUrl: string;
    fileKey: string | null;
    fileName: string;
    fileSize: number | null;
    fileType: string | null;
  }
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE landlord_verification_documents
        SET deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
          AND document_type = ?
          AND deleted_at IS NULL
      `
    )
    .bind(input.userId, input.documentType)
    .run();

  await db
    .prepare(
      `
        INSERT INTO landlord_verification_documents (
          user_id, document_type, file_url, file_key, file_name, file_size, file_type
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      input.userId,
      input.documentType,
      input.fileUrl,
      input.fileKey,
      input.fileName,
      input.fileSize,
      input.fileType
    )
    .run();

  await setVerificationStatus(db, input.userId, { status: 'pending' });
}

export async function removeVerificationDocument(
  db: D1Database,
  userId: number,
  documentType: VerificationDocumentType
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE landlord_verification_documents
        SET deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
          AND document_type = ?
          AND deleted_at IS NULL
      `
    )
    .bind(userId, documentType)
    .run();

  await setVerificationStatus(db, userId, { status: 'pending' });
}

/**
 * Writes the bundle status onto `landlord_profiles`, creating the profile row when a
 * landlord never completed onboarding. `approved`/`rejected` stamp the reviewer;
 * `pending`/`submitted` clear it.
 */
export async function setVerificationStatus(
  db: D1Database,
  userId: number,
  input: { status: VerificationStatus; note?: string | null; reviewedBy?: number | null }
): Promise<void> {
  const reviewed = input.status === 'approved' || input.status === 'rejected';

  if (reviewed) {
    await db
      .prepare(
        `
          INSERT INTO landlord_profiles (
            user_id, verification_status, verification_note,
            verification_reviewed_at, verification_reviewed_by
          )
          VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)
          ON CONFLICT(user_id) DO UPDATE SET
            verification_status = excluded.verification_status,
            verification_note = excluded.verification_note,
            verification_reviewed_at = CURRENT_TIMESTAMP,
            verification_reviewed_by = excluded.verification_reviewed_by,
            updated_at = CURRENT_TIMESTAMP
        `
      )
      .bind(userId, input.status, input.note ?? null, input.reviewedBy ?? null)
      .run();

    return;
  }

  await db
    .prepare(
      `
        INSERT INTO landlord_profiles (
          user_id, verification_status, verification_note,
          verification_reviewed_at, verification_reviewed_by
        )
        VALUES (?, ?, ?, NULL, NULL)
        ON CONFLICT(user_id) DO UPDATE SET
          verification_status = excluded.verification_status,
          verification_note = excluded.verification_note,
          verification_reviewed_at = NULL,
          verification_reviewed_by = NULL,
          updated_at = CURRENT_TIMESTAMP
      `
    )
    .bind(userId, input.status, input.note ?? null)
    .run();
}

/**
 * Stores an admin note without touching the bundle status — used by "request
 * documents", which nudges the landlord without discarding a prior rejection.
 */
export async function setVerificationNote(
  db: D1Database,
  userId: number,
  note: string | null
): Promise<void> {
  await db
    .prepare(
      `
        INSERT INTO landlord_profiles (user_id, verification_status, verification_note)
        VALUES (?, 'pending', ?)
        ON CONFLICT(user_id) DO UPDATE SET
          verification_note = excluded.verification_note,
          updated_at = CURRENT_TIMESTAMP
      `
    )
    .bind(userId, note)
    .run();
}

export async function createLandlordVerificationNotification(
  db: D1Database,
  input: {
    landlordId: number;
    landlordName: string;
    decision: 'approved' | 'rejected' | 'request_documents';
    reason?: string | null;
  }
): Promise<void> {
  const templates = {
    approved: {
      type: 'landlord_verification_approved',
      title: 'Verification approved',
      message: `Your account verification was approved, ${input.landlordName}. You can now manage your listings.`,
    },
    rejected: {
      type: 'landlord_verification_rejected',
      title: 'Verification rejected',
      message: input.reason
        ? `Your verification documents were rejected: ${input.reason}`
        : 'Your verification documents were rejected. Please upload new documents.',
    },
    request_documents: {
      type: 'landlord_verification_documents_requested',
      title: 'Documents requested',
      message: input.reason
        ? `An admin is asking for verification documents: ${input.reason}`
        : 'An admin is asking you to upload your verification documents.',
    },
  } as const;
  const template = templates[input.decision];

  await db
    .prepare(
      `
        INSERT INTO notifications (user_id, type, title, message, metadata)
        VALUES (?, ?, ?, ?, ?)
      `
    )
    .bind(
      input.landlordId,
      template.type,
      template.title,
      template.message,
      JSON.stringify({
        landlord_id: input.landlordId,
        decision: input.decision,
        reason: input.reason ?? null,
      })
    )
    .run();
}
