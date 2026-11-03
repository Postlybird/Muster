import "server-only";

import type { Period } from "@/domain/reports";
import type { SalesKind, SalesLine } from "@/domain/sales";
import { allRows } from "@/lib/supabase/all-rows";
import { createClient } from "@/lib/supabase/server";

/**
 * The sales and GST report's lines for a period, read as the signed-in
 * admin: admin_sales_lines() gives anyone else none. A year can run past
 * the database API's 1,000 rows a request, so it's read in pages.
 */
export async function loadSalesLines(period: Period): Promise<SalesLine[]> {
  const supabase = await createClient();
  const rows = await allRows("the sales report", (from, to) =>
    supabase
      .rpc("admin_sales_lines", { p_from: period.from, p_to: period.to })
      .order("on_date")
      .order("seq")
      .order("number")
      .range(from, to),
  );
  return rows.map(({ seq: _seq, ...row }) => ({
    ...row,
    kind: row.kind as SalesKind,
  }));
}
