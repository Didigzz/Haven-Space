export interface UserProfileRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  avatar_url: string | null;
  role: 'boarder' | 'landlord' | 'admin';
  is_verified: number;
  email_verified: number;
  account_status: string;
  boarder_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface PasswordUserRow {
  id: number;
  email: string;
  password_hash: string | null;
  google_id: string | null;
}

export interface PasswordResetRow {
  id: number;
  user_id: number;
  email: string;
  reset_code: string;
  expires_at: number;
  attempts: number;
  is_used: number;
}

export interface BoarderProfileRow {
  id: number;
  user_id: number;
  bio: string;
  occupation: string;
  move_in_date: string;
  onboarding_dismissed_at: string | null;
  onboarding_completed_at: string | null;
}

export async function findUserProfileById(
  db: D1Database,
  userId: number
): Promise<UserProfileRow | null> {
  return await db
    .prepare(
      `
        SELECT
          id,
          first_name,
          last_name,
          email,
          phone_number,
          avatar_url,
          role,
          is_verified,
          email_verified,
          account_status,
          boarder_status,
          created_at,
          updated_at
        FROM users
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(userId)
    .first<UserProfileRow>();
}

export async function updateUserProfile(
  db: D1Database,
  userId: number,
  input: { firstName: string; lastName: string; phoneNumber: string | null }
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE users
        SET first_name = ?,
            last_name = ?,
            phone_number = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND deleted_at IS NULL
      `
    )
    .bind(input.firstName, input.lastName, input.phoneNumber, userId)
    .run();
}

export async function updateUserAvatarUrl(
  db: D1Database,
  userId: number,
  avatarUrl: string
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE users
        SET avatar_url = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND deleted_at IS NULL
      `
    )
    .bind(avatarUrl, userId)
    .run();
}

export async function findPasswordUserById(
  db: D1Database,
  userId: number
): Promise<PasswordUserRow | null> {
  return await db
    .prepare(
      `
        SELECT id, email, password_hash, google_id
        FROM users
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(userId)
    .first<PasswordUserRow>();
}

export async function findPasswordUserByEmail(
  db: D1Database,
  email: string
): Promise<PasswordUserRow | null> {
  return await db
    .prepare(
      `
        SELECT id, email, password_hash, google_id
        FROM users
        WHERE lower(email) = lower(?)
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(email)
    .first<PasswordUserRow>();
}

export async function updatePasswordHash(
  db: D1Database,
  userId: number,
  passwordHash: string
): Promise<number> {
  const result = await db
    .prepare(
      `
        UPDATE users
        SET password_hash = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND deleted_at IS NULL
      `
    )
    .bind(passwordHash, userId)
    .run();

  return result.meta.changes ?? 0;
}

export async function findActivePasswordResetRequest(
  db: D1Database,
  userId: number,
  now: number
): Promise<{ id: number } | null> {
  return await db
    .prepare(
      `
        SELECT id
        FROM password_reset_requests
        WHERE user_id = ?
          AND is_used = 0
          AND expires_at > ?
        ORDER BY created_at DESC
        LIMIT 1
      `
    )
    .bind(userId, now)
    .first<{ id: number }>();
}

export async function upsertPasswordResetRequest(
  db: D1Database,
  input: { userId: number; email: string; resetCode: string; expiresAt: number; now: number }
): Promise<number> {
  const existing = await findActivePasswordResetRequest(db, input.userId, input.now);

  if (existing) {
    await db
      .prepare(
        `
          UPDATE password_reset_requests
          SET reset_code = ?,
              expires_at = ?,
              attempts = 0,
              updated_at = ?
          WHERE id = ?
        `
      )
      .bind(input.resetCode, input.expiresAt, input.now, existing.id)
      .run();

    return Number(existing.id);
  }

  const result = await db
    .prepare(
      `
        INSERT INTO password_reset_requests (
          user_id,
          email,
          reset_code,
          expires_at,
          attempts,
          is_used,
          created_at
        )
        VALUES (?, ?, ?, ?, 0, 0, ?)
      `
    )
    .bind(input.userId, input.email, input.resetCode, input.expiresAt, input.now)
    .run();

  return Number(result.meta.last_row_id);
}

export async function findPasswordResetByCode(
  db: D1Database,
  email: string,
  code: string
): Promise<PasswordResetRow | null> {
  return await db
    .prepare(
      `
        SELECT id, user_id, email, reset_code, expires_at, attempts, is_used
        FROM password_reset_requests
        WHERE lower(email) = lower(?)
          AND reset_code = ?
          AND is_used = 0
        ORDER BY created_at DESC
        LIMIT 1
      `
    )
    .bind(email, code)
    .first<PasswordResetRow>();
}

export async function findPasswordResetByIdAndEmail(
  db: D1Database,
  requestId: number,
  email: string
): Promise<PasswordResetRow | null> {
  return await db
    .prepare(
      `
        SELECT id, user_id, email, reset_code, expires_at, attempts, is_used
        FROM password_reset_requests
        WHERE id = ?
          AND lower(email) = lower(?)
          AND is_used = 0
        LIMIT 1
      `
    )
    .bind(requestId, email)
    .first<PasswordResetRow>();
}

export async function incrementPasswordResetAttempts(
  db: D1Database,
  requestId: number
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE password_reset_requests
        SET attempts = attempts + 1,
            updated_at = ?
        WHERE id = ?
      `
    )
    .bind(Math.floor(Date.now() / 1000), requestId)
    .run();
}

export async function markPasswordResetUsed(
  db: D1Database,
  requestId: number,
  usedAt: number
): Promise<void> {
  await db
    .prepare(
      `
        UPDATE password_reset_requests
        SET is_used = 1,
            used_at = ?,
            updated_at = ?
        WHERE id = ?
      `
    )
    .bind(usedAt, usedAt, requestId)
    .run();
}

export async function ensureBoarderProfile(
  db: D1Database,
  userId: number
): Promise<BoarderProfileRow> {
  const existing = await db
    .prepare(
      `
        SELECT
          id,
          user_id,
          bio,
          occupation,
          move_in_date,
          onboarding_dismissed_at,
          onboarding_completed_at
        FROM boarder_profiles
        WHERE user_id = ?
        LIMIT 1
      `
    )
    .bind(userId)
    .first<BoarderProfileRow>();

  if (existing) {
    return existing;
  }

  await db
    .prepare(
      `
        INSERT INTO boarder_profiles (user_id)
        VALUES (?)
      `
    )
    .bind(userId)
    .run();

  const created = await db
    .prepare(
      `
        SELECT
          id,
          user_id,
          bio,
          occupation,
          move_in_date,
          onboarding_dismissed_at,
          onboarding_completed_at
        FROM boarder_profiles
        WHERE user_id = ?
        LIMIT 1
      `
    )
    .bind(userId)
    .first<BoarderProfileRow>();

  if (!created) {
    throw new Error('Failed to create boarder profile');
  }

  return created;
}

export async function hasAcceptedApplication(db: D1Database, userId: number): Promise<boolean> {
  const row = await db
    .prepare(
      `
        SELECT COUNT(*) AS count
        FROM applications
        WHERE boarder_id = ?
          AND status = 'accepted'
          AND deleted_at IS NULL
      `
    )
    .bind(userId)
    .first<{ count: number }>();

  return Number(row?.count ?? 0) > 0;
}

export async function updateBoarderOnboardingAction(
  db: D1Database,
  userId: number,
  action: string
): Promise<void> {
  if (action === 'dismiss') {
    await db
      .prepare(
        `
          UPDATE boarder_profiles
          SET onboarding_dismissed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `
      )
      .bind(userId)
      .run();
    return;
  }

  if (action === 'complete') {
    await db
      .prepare(
        `
          UPDATE boarder_profiles
          SET onboarding_completed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `
      )
      .bind(userId)
      .run();
  }
}
