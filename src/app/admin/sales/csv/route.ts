import type { NextRequest } from "next/server";

import { customPeriod } from "@/domain/reports";
import { requireAdmin } from "@/lib/auth";
import { salesCsv } from "@/lib/sales-csv";
import { loadSalesLines } from "@/server/sales";

/** The sales and GST report for a period, as a spreadsheet for the accountant. */
export async function GET(request: NextRequest) {
  await requireAdmin();
  const params = request.nextUrl.searchParams;
  const period = customPeriod(params.get("from") ?? "", params.get("to") ?? "");
  if (!period) {
    return new Response(
      "Choose a start date before the end date, at most a year apart.",
      { status: 400 },
    );
  }
  const lines = await loadSalesLines(period);
  return new Response(salesCsv(lines), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-${period.from}_${period.to}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
