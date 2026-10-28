/**
 * The most rows the database API returns for one request (`max_rows` in
 * supabase/config.toml, the same as the hosted project's default).
 */
export const PAGE_SIZE = 1000;

/**
 * Every row a query matches, for jobs that read a whole table: one request
 * stops at PAGE_SIZE rows without saying so. `page` runs the query for rows
 * `from` to `to`, ordered by something unique so pages don't overlap.
 */
export async function allRows<T>(
  what: string,
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Couldn't load ${what}: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE_SIZE) return rows;
  }
}
