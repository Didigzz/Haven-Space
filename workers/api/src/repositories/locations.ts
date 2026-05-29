export interface PopularLocationRow {
  city: string | null;
  province: string | null;
  property_count: number;
}

export async function listPopularLocations(
  db: D1Database,
  limit: number
): Promise<PopularLocationRow[]> {
  const result = await db
    .prepare(
      `
        SELECT
          a.city,
          a.province,
          COUNT(*) as property_count
        FROM properties p
        JOIN addresses a ON p.address_id = a.id
        WHERE p.deleted_at IS NULL
        GROUP BY a.city, a.province
        ORDER BY property_count DESC
        LIMIT ?
      `
    )
    .bind(limit)
    .all<PopularLocationRow>();

  return result.results ?? [];
}
