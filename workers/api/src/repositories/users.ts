export interface AuthUserRow {
  google_id: string | null;
  password_hash: string | null;
}

export interface AuthenticatedUserRow {
  id: number;
  role: 'boarder' | 'landlord' | 'admin';
  is_verified: number;
  email_verified: number;
  account_status: string;
}

export async function findAuthUserByEmail(
  db: D1Database,
  email: string
): Promise<AuthUserRow | null> {
  return await db
    .prepare(
      `
        SELECT google_id, password_hash
        FROM users
        WHERE lower(email) = lower(?)
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(email)
    .first<AuthUserRow>();
}

export async function findAuthenticatedUserById(
  db: D1Database,
  userId: number
): Promise<AuthenticatedUserRow | null> {
  return await db
    .prepare(
      `
        SELECT id, role, is_verified, email_verified, account_status
        FROM users
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(userId)
    .first<AuthenticatedUserRow>();
}
