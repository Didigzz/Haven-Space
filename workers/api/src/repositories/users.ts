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

export interface UserAccountRow extends AuthenticatedUserRow {
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  google_id: string | null;
  boarder_status: string | null;
  phone_number: string | null;
  avatar_url: string | null;
}

export interface CreateUserInput {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: 'boarder' | 'landlord';
  accountStatus: string;
  isVerified: number;
  emailVerified: number;
  boarderStatus: string | null;
}

export interface CreateLandlordProfileInput {
  userId: number;
  boardingHouseName: string;
  boardingHouseDescription: string;
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

export async function findUserAccountByEmail(
  db: D1Database,
  email: string
): Promise<UserAccountRow | null> {
  return await db
    .prepare(
      `
        SELECT
          id,
          first_name,
          last_name,
          email,
          password_hash,
          google_id,
          role,
          is_verified,
          email_verified,
          account_status,
          boarder_status,
          phone_number,
          avatar_url
        FROM users
        WHERE lower(email) = lower(?)
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(email)
    .first<UserAccountRow>();
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

export async function findUserAccountById(
  db: D1Database,
  userId: number
): Promise<UserAccountRow | null> {
  return await db
    .prepare(
      `
        SELECT
          id,
          first_name,
          last_name,
          email,
          password_hash,
          google_id,
          role,
          is_verified,
          email_verified,
          account_status,
          boarder_status,
          phone_number,
          avatar_url
        FROM users
        WHERE id = ?
          AND deleted_at IS NULL
        LIMIT 1
      `
    )
    .bind(userId)
    .first<UserAccountRow>();
}

function insertedId(result: D1Result, label: string): number {
  const id = Number(result.meta.last_row_id);

  if (!Number.isFinite(id) || id <= 0) {
    throw new Error(`${label} insert did not return an ID`);
  }

  return id;
}

export async function createUserAccount(db: D1Database, input: CreateUserInput): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO users (
          first_name,
          last_name,
          email,
          password_hash,
          role,
          is_verified,
          email_verified,
          account_status,
          boarder_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .bind(
      input.firstName,
      input.lastName,
      input.email,
      input.passwordHash,
      input.role,
      input.isVerified,
      input.emailVerified,
      input.accountStatus,
      input.boarderStatus
    )
    .run();

  return insertedId(result, 'User');
}

export async function createLandlordProfile(
  db: D1Database,
  input: CreateLandlordProfileInput
): Promise<number> {
  const result = await db
    .prepare(
      `
        INSERT INTO landlord_profiles (
          user_id,
          boarding_house_name,
          boarding_house_description,
          property_type,
          total_rooms,
          available_rooms
        )
        VALUES (?, ?, ?, 'Single unit', 1, 1)
      `
    )
    .bind(input.userId, input.boardingHouseName, input.boardingHouseDescription)
    .run();

  return insertedId(result, 'Landlord profile');
}

export async function determineBoarderStatus(db: D1Database, boarderId: number): Promise<string> {
  const accepted = await db
    .prepare(
      `
        SELECT COUNT(*) as count
        FROM applications
        WHERE boarder_id = ?
          AND status IN ('accepted', 'confirmed')
          AND deleted_at IS NULL
      `
    )
    .bind(boarderId)
    .first<{ count: number }>();

  if (Number(accepted?.count ?? 0) > 0) {
    return 'accepted';
  }

  const pending = await db
    .prepare(
      `
        SELECT COUNT(*) as count
        FROM applications
        WHERE boarder_id = ?
          AND status = 'pending'
          AND deleted_at IS NULL
      `
    )
    .bind(boarderId)
    .first<{ count: number }>();

  if (Number(pending?.count ?? 0) > 0) {
    return 'applied_pending';
  }

  const any = await db
    .prepare(
      `
        SELECT COUNT(*) as count
        FROM applications
        WHERE boarder_id = ?
          AND deleted_at IS NULL
      `
    )
    .bind(boarderId)
    .first<{ count: number }>();

  return Number(any?.count ?? 0) > 0 ? 'rejected' : 'new';
}
